import * as Sentry from '@sentry/nextjs';
import { AGENTS } from './agents';
import { chatWithUsage } from './llm';
import { createReply, getPost, incrementLike, listListings } from './store';
import { startPostTrace, tracedLLMCall, flushTraces, type TraceContext } from './observability/llm-tracer';
import type { AgentPersona, Post } from './types';

const HOUSING_KW   = ['sublet', 'rent', 'room', 'apartment', 'sublease', 'housing', 'roommate', 'lease', '转租', '找房'];
const EVENT_KW     = ['party', 'event', 'concert', 'show', 'gallery', 'tonight', 'weekend', 'ticket', '活动'];
const FURNITURE_KW = ['furniture', 'desk', 'chair', 'couch', 'sofa', 'ikea', 'selling', 'sell', '家具'];

async function buildListingContext(content: string): Promise<string | null> {
  const lower = content.toLowerCase();
  const isHousing   = HOUSING_KW.some((k) => lower.includes(k));
  const isEvent     = EVENT_KW.some((k) => lower.includes(k));
  const isFurniture = !isHousing && FURNITURE_KW.some((k) => lower.includes(k));
  if (!isHousing && !isEvent && !isFurniture) return null;

  const category = isHousing ? 'sublet' : isFurniture ? 'furniture' : 'tickets';
  try {
    const all = await listListings({ category });
    const top5 = all.filter((l) => l.status === 'open').slice(0, 5);
    if (top5.length === 0) return null;
    const lines = top5.map((l) => {
      const price = l.asking_price_cents > 0 ? `$${(l.asking_price_cents / 100).toFixed(0)}` : 'price TBD';
      const loc = l.location ? ` · ${l.location}` : '';
      return `• "${l.title}" — ${price}${loc} (see /trade/${l.id})`;
    });
    return `[Live listings on AXIO7 Trade]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

export type FanoutResult = {
  succeeded: number;
  failed: number;
  totalLatencyMs: number;
  totalCostUsd: number;
};

export async function fanOutAgentReplies(
  postId: string,
  mentionedAgentId?: string
): Promise<FanoutResult> {
  const post = await getPost(postId);
  if (!post) {
    console.error('[fanout] post not found', postId);
    return { succeeded: 0, failed: 0, totalLatencyMs: 0, totalCostUsd: 0 };
  }

  const traceCtx = startPostTrace(postId, post.author_id);

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

  const fanoutStart = Date.now();
  const results = await Promise.allSettled(
    orderedAgents.map((agent) => runOneAgent(agent, post, traceCtx))
  );

  let succeeded = 0;
  let failed = 0;
  let totalCostUsd = 0;
  results.forEach((r, i) => {
    const slug = orderedAgents[i].id;
    if (r.status === 'rejected') {
      failed++;
      console.error('[fanout]', slug, r.reason);
      return;
    }
    if (r.value.ok) {
      succeeded++;
      totalCostUsd += r.value.costUsd;
      return;
    }
    failed++;
    console.error('[fanout]', slug, r.value.error);
  });

  const totalLatencyMs = Date.now() - fanoutStart;
  console.log(`[fanout] post ${postId}: ${succeeded}/${orderedAgents.length} agents replied`);

  flushTraces().catch(() => {});

  return { succeeded, failed, totalLatencyMs, totalCostUsd };
}

type AgentRunResult = { ok: true; costUsd: number } | { ok: false; error: unknown };

async function runOneAgent(
  agent: AgentPersona,
  post: Post,
  traceCtx: TraceContext
): Promise<AgentRunResult> {
  try {
    const listingCtx = await buildListingContext(post.content);
    const userContent = listingCtx
      ? `${post.content}\n\n${listingCtx}`
      : post.content;

    const result = await tracedLLMCall(
      agent,
      post.content,
      () =>
        chatWithUsage(
          [
            { role: 'system', content: agent.system_prompt },
            { role: 'user', content: userContent },
          ],
          {
            model: agent.model,
            temperature: 0.8,
            max_tokens: agent.model?.includes('kimi') ? 800 : 220,
          }
        ),
      traceCtx
    );

    const trimmed = result.content?.trim();
    if (!trimmed) {
      return { ok: false, error: 'empty completion' };
    }

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
      incrementLike(post.id, `agent-${agent.id}`).catch((err) => {
        console.warn('[fanout] like failed', agent.id, err);
      }),
    ]);

    return { ok: true, costUsd: result.costUsd };
  } catch (err) {
    Sentry.captureException(err, {
      extra: {
        agent_name: agent.name,
        agent_id: agent.id,
        model: agent.model,
        post_id: post.id,
        author_id: post.author_id,
        prompt_preview: post.content.slice(0, 200),
      },
    });
    return { ok: false, error: err };
  }
}
