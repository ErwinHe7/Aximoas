import { AGENTS } from './agents';
import { chat } from './llm';
import { createReply, getPost, incrementLike } from './store';
import type { AgentPersona, Post } from './types';

/**
 * Fan out a new post to all 7 agent personas concurrently.
 *
 * Each agent:
 *  1. Generates a reply via its own TokenRouter model (`agent.model`)
 *     using the shared OPENAI_API_KEY + OPENAI_BASE_URL.
 *  2. Writes the reply to Supabase (or in-memory fallback).
 *  3. Adds a like on the original post as a pseudo-user (`agent-<slug>`),
 *     so repeat fanouts don't inflate likes from the same agent.
 *
 * Errors from any one agent are isolated (`Promise.allSettled`) so a
 * single 503 or bad response doesn't kill the other 6.
 *
 * Intended to be called fire-and-forget from the POST /api/posts handler.
 */
export async function fanOutAgentReplies(
  postId: string,
  mentionedAgentId?: string
): Promise<{ succeeded: number; failed: number }> {
  const post = await getPost(postId);
  if (!post) {
    console.error('[fanout] post not found', postId);
    return { succeeded: 0, failed: 0 };
  }

  // If an agent was @mentioned, run it first (awaited), then fan out the rest concurrently.
  // This ensures the mentioned agent's reply lands earliest in the feed.
  let orderedAgents = [...AGENTS];
  if (mentionedAgentId) {
    const idx = orderedAgents.findIndex((a) => a.id === mentionedAgentId);
    if (idx > 0) {
      const [mentioned] = orderedAgents.splice(idx, 1);
      orderedAgents.unshift(mentioned);
    }
    if (idx !== -1) {
      console.log(`[fanout] @mention detected — running ${mentionedAgentId} first`);
    }
  }

  const results = await Promise.allSettled(
    orderedAgents.map((agent) => runOneAgent(agent, post))
  );

  let succeeded = 0;
  let failed = 0;
  results.forEach((r, i) => {
    const slug = orderedAgents[i].id;
    if (r.status === 'rejected') {
      failed++;
      console.error('[fanout]', slug, r.reason);
      return;
    }
    if (r.value.ok) {
      succeeded++;
      return;
    }
    failed++;
    console.error('[fanout]', slug, r.value.error);
  });

  console.log(`[fanout] post ${postId}: ${succeeded}/${orderedAgents.length} agents replied`);
  return { succeeded, failed };
}

type AgentRunResult = { ok: true } | { ok: false; error: unknown };

async function runOneAgent(agent: AgentPersona, post: Post): Promise<AgentRunResult> {
  try {
    const content = await chat(
      [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: post.content },
      ],
      {
        model: agent.model,
        temperature: 0.8,
        max_tokens: agent.model?.includes('kimi') ? 800 : 220,
      }
    );

    const trimmed = content?.trim();
    if (!trimmed) {
      return { ok: false, error: 'empty completion' };
    }

    // Fire reply + like concurrently — they're independent writes.
    await Promise.all([
      createReply({
        post_id: post.id,
        author_kind: 'agent',
        author_name: agent.name,
        author_avatar: agent.avatar,
        agent_persona: agent.id,
        content: trimmed,
        confidence_score: 0.8,
        visibility: 'public',
      }),
      // Each agent likes as its own pseudo-user so like_count increments by 7
      // and re-triggering the fanout is a no-op per agent (toggles via
      // post_likes uniqueness).
      incrementLike(post.id, `agent-${agent.id}`).catch((err) => {
        // Like is nice-to-have; don't fail the whole agent run if the like
        // dedupe table already has an entry.
        console.warn('[fanout] like failed', agent.id, err);
      }),
    ]);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
