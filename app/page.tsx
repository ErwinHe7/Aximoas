import { PostComposer } from '@/components/PostComposer';
import { PostCard } from '@/components/PostCard';
import { listPosts, listReplies } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function FeedPage() {
  const posts = listPosts();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Post anything. Nova, Atlas, Lumen, or Ember will reply — depending on what you write.
        </p>
      </div>
      <PostComposer />
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} replies={listReplies(post.id)} />
        ))}
      </div>
    </div>
  );
}
