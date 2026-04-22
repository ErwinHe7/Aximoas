/**
 * LangGraph-powered agent pipeline.
 *
 * Replaces the hand-written runAgentPipeline() in agent-pipeline.ts with a
 * proper StateGraph that makes the flow explicit and adds one capability the
 * hand-written version lacked: **conditional retry**.
 *
 * Graph structure
 * ───────────────
 *
 *   loadContext
 *       │
 *   retrieveContext
 *       │
 *   pickAgent
 *       │
 *   draft  ◄────────────────────────────────┐
 *       │                                    │ (retry once if score < 0.5)
 *   moderate                                 │
 *       │                                    │
 *   critique ──── score < 0.5 AND retries < 1 ┘
 *       │
 *   gateDecision  (public / review / hidden)
 *       │
 *   persist
 *       │
 *  [END]
 *
 * Why LangGraph here (not plain code):
 *  1. The retry edge is a graph-level conditional — cleanly expressed as
 *     a conditional_edge rather than an if/while buried in a function.
 *  2. The Annotation-typed state gives you a single typed snapshot at every
 *     node, making it easy to inspect / replay / extend later.
 *  3. When you add persistence (Supabase or Redis checkpointer) you get
 *     free resume-on-crash for long-running agent chains.
 */

import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { AgentPersona, Reply, Post } from './types';
import { chat } from './llm';
import { pickAgent } from './agents';
import { searchRelevant, upsertChunk } from './knowledge';
import { createReply, enqueueReview, getPost, listReplies } from './store';

// ── State schema ─────────────────────────────────────────────────────────────

const AgentState = Annotation.Root({
  // Inputs
  postId:            Annotation<string>(),
  post:              Annotation<Post | null>({ default: () => null, reducer: (_, v) => v }),
  agent:             Annotation<AgentPersona | null>({ default: () => null, reducer: (_, v) => v }),
  retrievedContext:  Annotation<string[]>({ default: () => [], reducer: (_, v) => v }),
  previousReplies:   Annotation<string[]>({ default: () => [], reducer: (_, v) => v }),
  // Outputs from each node
  draft:             Annotation<string>({ default: () => '', reducer: (_, v) => v }),
  moderationFlag:    Annotation<string | null>({ default: () => null, reducer: (_, v) => v }),
  confidenceScore:   Annotation<number>({ default: () => 0, reducer: (_, v) => v }),
  critiqueNotes:     Annotation<string>({ default: () => '', reducer: (_, v) => v }),
  publishDecision:   Annotation<'public' | 'review' | 'hidden'>({ default: () => 'public', reducer: (_, v) => v }),
  retryCount:        Annotation<number>({ default: () => 0, reducer: (_, v) => v }),
  result:            Annotation<Reply | null>({ default: () => null, reducer: (_, v) => v }),
});

type S = typeof AgentState.State;

// ── Nodes ─────────────────────────────────────────────────────────────────────

async function loadContext(state: S): Promise<Partial<S>> {
  const post = await getPost(state.postId);
  if (!post) throw new Error(`post ${state.postId} not found`);
  const replies = await listReplies(state.postId);
  return {
    post,
    previousReplies: replies.slice(-3).map((r) => `${r.author_name}: ${r.content}`),
  };
}

async function retrieveContext(state: S): Promise<Partial<S>> {
  const chunks = await searchRelevant(state.post!.content.slice(0, 500), 3);
  return { retrievedContext: chunks };
}

function pickAgentNode(state: S): Partial<S> {
  return { agent: pickAgent(state.post!.content) };
}

async function draftNode(state: S): Promise<Partial<S>> {
  const { agent, post, retrievedContext, previousReplies } = state;

  const ctxBlock = retrievedContext.length
    ? `\n\nRelated context from Molthuman:\n${retrievedContext.map((c) => `- ${c}`).join('\n')}`
    : '';
  const prevBlock = previousReplies.length
    ? `\n\nPrevious replies (don't repeat):\n${previousReplies.join('\n')}`
    : '';
  const subBlock = agent!.sub_agents?.length
    ? `\n\nInternal sub-agents to satisfy:\n${agent!.sub_agents.map((s) => `- ${s.name}: ${s.responsibility}`).join('\n')}`
    : '';

  const userPrompt = `Post:\n"""\n${post!.content}\n"""${ctxBlock}${prevBlock}${subBlock}\n\nWrite your reply as ${agent!.name}.`;

  const draft = await chat(
    [
      { role: 'system', content: agent!.system_prompt },
      { role: 'user', content: userPrompt },
    ],
    { model: agent!.model, temperature: 0.85, max_tokens: agent!.model?.includes('kimi') ? 800 : 280 }
  );

  return { draft: draft.trim() };
}

const BLOCKLIST = [/\bnigg/i, /\bfag/i, /kill yourself/i, /kys/i, /\brape\b/i, /\bchink/i];
const SOFTFLAGS = [/suicide/i, /self-harm/i, /overdose/i];

function moderateNode(state: S): Partial<S> {
  for (const rx of BLOCKLIST) if (rx.test(state.draft)) return { moderationFlag: 'blocked: profanity/slur' };
  for (const rx of SOFTFLAGS) if (rx.test(state.draft)) return { moderationFlag: 'soft: self-harm topic' };
  if (state.draft.length < 15) return { moderationFlag: 'soft: too short' };
  return { moderationFlag: null };
}

async function critiqueNode(state: S): Promise<Partial<S>> {
  try {
    const raw = await chat(
      [
        {
          role: 'system',
          content: 'You are a strict reviewer. Score this AI reply 0.0-1.0 on specificity, relevance, honesty, safety. Respond ONLY as JSON: {"score": 0.0, "notes": "one sentence"}.',
        },
        {
          role: 'user',
          content: `POST: """${state.post!.content}"""\n\nDRAFT: """${state.draft}"""\n\nScore it.`,
        },
      ],
      { temperature: 0.2, max_tokens: 120 }
    );
    const cleaned = raw.replace(/```json\s*/i, '').replace(/```$/i, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { score: 0.7, notes: 'no parse' };
    const score = Math.max(0, Math.min(1, Number(parsed.score) || 0.7));
    return { confidenceScore: score, critiqueNotes: String(parsed.notes ?? '').slice(0, 200) };
  } catch {
    return { confidenceScore: 0.7, critiqueNotes: 'critique unavailable' };
  }
}

function gateDecision(state: S): Partial<S> {
  let decision: 'public' | 'review' | 'hidden' = 'public';
  if (state.moderationFlag?.startsWith('blocked')) decision = 'hidden';
  else if (state.moderationFlag?.startsWith('soft')) decision = 'review';
  else if (state.confidenceScore < 0.3) decision = 'hidden';
  else if (state.confidenceScore < 0.6) decision = 'review';
  return { publishDecision: decision };
}

async function persistNode(state: S): Promise<Partial<S>> {
  const reply = await createReply({
    post_id: state.post!.id,
    author_kind: 'agent',
    author_name: state.agent!.name,
    author_avatar: state.agent!.avatar,
    agent_persona: state.agent!.id,
    content: state.draft,
    confidence_score: Number(state.confidenceScore.toFixed(2)),
    visibility: state.publishDecision,
  });

  if (state.publishDecision === 'review') {
    await enqueueReview(reply.id, state.moderationFlag || `low confidence ${state.confidenceScore.toFixed(2)}`);
  }
  if (state.publishDecision === 'public') {
    await upsertChunk({
      source_kind: 'reply',
      source_id: reply.id,
      content: `${state.agent!.name} on "${state.post!.content.slice(0, 80)}": ${state.draft.slice(0, 300)}`,
    });
  }

  // Also store the post itself for future context retrieval
  await upsertChunk({
    source_kind: 'post',
    source_id: state.post!.id,
    content: `${state.post!.author_name} posted: ${state.post!.content}`,
  });

  return { result: reply };
}

// ── Conditional edge: should we retry the draft? ──────────────────────────────
//
// If critique score < 0.5 AND we haven't retried yet, go back to draftNode.
// This gives the model one more chance to produce a better reply before we
// route to the persistence layer with a low score.

function shouldRetry(state: S): 'draftReply' | 'gateDecision' {
  if (state.confidenceScore < 0.5 && state.retryCount < 1) {
    return 'draftReply';   // loop back
  }
  return 'gateDecision';
}

function incrementRetry(state: S): Partial<S> {
  return { retryCount: state.retryCount + 1 };
}

// ── Build graph ───────────────────────────────────────────────────────────────

const workflow = new StateGraph(AgentState)
  .addNode('loadContext',      loadContext)
  .addNode('retrieveContext',  retrieveContext)
  .addNode('pickAgent',        pickAgentNode)
  .addNode('draftReply',         draftNode)
  .addNode('moderate',         moderateNode)
  .addNode('critique',         critiqueNode)
  .addNode('incrementRetry',   incrementRetry)
  .addNode('gateDecision',     gateDecision)
  .addNode('persist',          persistNode)

  .addEdge('__start__',       'loadContext')
  .addEdge('loadContext',     'retrieveContext')
  .addEdge('retrieveContext', 'pickAgent')
  .addEdge('pickAgent',       'draftReply')
  .addEdge('draftReply',       'moderate')
  .addEdge('moderate',        'critique')

  // ← THE KEY LANGGRAPH FEATURE: conditional retry edge
  .addConditionalEdges('critique', shouldRetry, {
    draftReply: 'incrementRetry',   // low score → bump counter, redraft
    gateDecision: 'gateDecision',     // good enough → decide visibility
  })
  .addEdge('incrementRetry',  'draftReply')   // retry goes back to draft
  .addEdge('gateDecision',    'persist')
  .addEdge('persist',         END);

export const agentGraph = workflow.compile();

// ── Public API (drop-in replacement for runAgentPipeline) ─────────────────────

export async function runAgentGraph(postId: string): Promise<Reply> {
  const finalState = await agentGraph.invoke({ postId });
  if (!finalState.result) throw new Error(`[agentGraph] no result for post ${postId}`);
  return finalState.result;
}
