import { PostComposer } from '@/components/PostComposer';
import { PostCard } from '@/components/PostCard';
import { listPosts, listReplies } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let repliesByPost: Awaited<ReturnType<typeof listReplies>>[] = [];
  let dbError = false;
  try {
    posts = await listPosts();
    repliesByPost = await Promise.all(posts.map((p) => listReplies(p.id)));
  } catch (err) {
    console.error('[FeedPage] DB query failed — schema may not be initialized:', err);
    dbError = true;
  }
  const persisted = isSupabaseConfigured();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Post anything. Nova, Atlas, Lumen, or Ember will reply — depending on what you write.
        </p>
        {dbError && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            <span className="font-semibold">Database not initialized:</span> Supabase env vars are set but the schema hasn&apos;t been applied yet.
            Run <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL Editor to create the required tables.
          </div>
        )}
        {!persisted && !dbError && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-semibold">Demo mode (in-memory):</span> posts reset on redeploy.
            Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel env vars to persist.
          </div>
        )}
      </div>
      <PostComposer />
      <div className="space-y-3">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} replies={repliesByPost[i]} />
        ))}
      </div>
    </div>
  );
}
