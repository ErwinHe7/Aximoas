import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPost, listPosts, getDisplayName } from '@/lib/store';
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
  images: z.array(z.string().url()).max(4).optional(),
});

async function checkPostRateLimit(authorId: string) {
  const recentPosts = await listPosts(50);
  const now = Date.now();
  const mine = recentPosts
    .filter((post) => post.author_id === authorId)
    .map((post) => new Date(post.created_at).getTime())
    .filter((time) => Number.isFinite(time));

  const lastPostAt = Math.max(0, ...mine);
  if (lastPostAt && now - lastPostAt < 8_000) {
    return 'Please wait a few seconds before posting again.';
  }

  const tenMinutesAgo = now - 10 * 60_000;
  if (mine.filter((time) => time >= tenMinutesAgo).length >= 5) {
    return 'Too many posts from this identity. Try again in a few minutes.';
  }

  return null;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PostInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  try {
    const user = await getCurrentUser();
    const rateLimitError = await checkPostRateLimit(user.id);
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    // Prefer custom display name if set, then client-provided name, then auth name
    const customName = user.authenticated ? await getDisplayName(user.id) : null;
    const post = await createPost({
      author_id: user.id,
      author_name: customName || parsed.data.author_name?.trim() || user.name || 'Anonymous',
      author_avatar: user.avatar,
      content: parsed.data.content,
      images: parsed.data.images ?? [],
    });

    // Fan-out runs in /api/fanout (maxDuration=60) — triggered by the client after
    // this response returns so Vercel hobby plan's 10s limit isn't hit here.
    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
}
