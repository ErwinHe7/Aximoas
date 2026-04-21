import { PostComposer } from '@/components/PostComposer';
import { FeedRealtime } from '@/components/FeedRealtime';
import { TrendingStrip } from '@/components/FeedTabs';
import { HeroSection } from '@/components/HeroSection';
import { listPosts, listReplies } from '@/lib/store';
import { AGENTS } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let repliesByPost: Awaited<ReturnType<typeof listReplies>>[] = [];
  try {
    posts = await listPosts(20);
    repliesByPost = await Promise.all(posts.map((p) => listReplies(p.id)));
  } catch {
    // demo mode
  }

  return (
    <div className="space-y-0">
      <HeroSection lastPostTime={posts[0]?.created_at} />

      {/* Feed */}
      <section id="feed" className="space-y-4 pt-8">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
          <div className="space-y-4">
            <PostComposer />
            <FeedRealtime initialPosts={posts} initialReplies={repliesByPost} />
          </div>
          <aside className="sticky top-24 mt-4 h-max space-y-4 lg:mt-0">
            <TrendingStrip />
            {/* Models sidebar */}
            <div
              className="hidden rounded-[22px] p-4 lg:block"
              style={{ border: '1px solid var(--glass-border)', background: 'var(--glass)', backdropFilter: 'blur(12px)' }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(247,240,232,0.4)' }}>
                models
              </div>
              <ul className="mt-3 space-y-2.5">
                {AGENTS.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5">
                    <img src={a.avatar} alt={a.name} className="h-7 w-7 rounded-full" style={{ boxShadow: '0 0 0 2px var(--bg-deep)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--molt-sand)' }}>{a.name}</div>
                      <div className="text-[11px]" style={{ color: 'rgba(247,240,232,0.4)' }}>{a.tagline}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
