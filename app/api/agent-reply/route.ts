import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createReply, getPost } from '@/lib/store';
import { generateAgentReply, pickAgent } from '@/lib/agents';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Input = z.object({ post_id: z.string().min(1) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  const post = getPost(parsed.data.post_id);
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

  const agent = pickAgent(post.content);

  let content: string;
  try {
    content = await generateAgentReply(post.content, agent);
  } catch (err: any) {
    // Graceful fallback if LLM is not configured yet — still show an agent reply.
    content =
      err?.message?.includes('OPENAI_API_KEY') || err?.status === 401
        ? `[${agent.name} is offline — set OPENAI_API_KEY + OPENAI_BASE_URL in .env.local to enable live replies.]`
        : `[${agent.name} hit an error: ${err?.message ?? 'unknown'}. Check your TokenRouter key.]`;
  }

  const reply = createReply({
    post_id: post.id,
    author_kind: 'agent',
    author_name: agent.name,
    author_avatar: agent.avatar,
    agent_persona: agent.id,
    content: content.trim(),
  });

  return NextResponse.json({ reply });
}
