import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPost, listPosts } from '@/lib/store';
import { fanOutAgentReplies } from '@/lib/agent-fanout';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = await listPosts();
    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('[GET /api/posts]', err?.message);
    return NextResponse.json({ posts: [], error: err?.message ?? 'db error' }, { status: 500 });
  }
}

const PostInput = z.object({
  author_name: z.string().max(80).optional(),
  content: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PostInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  try {
    // Attribute the post to the real signed-in user when available.
    // Guests fall back to a stable-per-browser cookie id (see middleware.ts).
    const user = await getCurrentUser();

    const post = await createPost({
      author_id: user.id,
      // Prefer the name the user typed; otherwise use their real profile name.
      author_name: parsed.data.author_name?.trim() || user.name || 'Anonymous',
      author_avatar: user.avatar,
      content: parsed.data.content,
    });

    // Fan out to 7 agents in the background — don't block the response on LLM
    // latency. On Vercel serverless this still runs because Next keeps the
    // function alive until the promise settles (waitUntil-style behavior for
    // route handlers). Errors are swallowed here and logged inside the fanout.
    fanOutAgentReplies(post.id).catch((err) =>
      console.error('[posts POST] fanout failed', err)
    );

    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
}
