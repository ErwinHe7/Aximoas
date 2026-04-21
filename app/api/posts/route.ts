import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPost, listPosts } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ posts: listPosts() });
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
  const post = createPost({
    author_name: parsed.data.author_name ?? 'Anonymous',
    content: parsed.data.content,
  });
  return NextResponse.json({ post });
}
