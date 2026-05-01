import { PostComposer } from '@/components/PostComposer';
import { FeedRealtime } from '@/components/FeedRealtime';
import { TrendingStrip } from '@/components/FeedTabs';
import { HeroSection } from '@/components/HeroSection';
import { StatsBar } from '@/components/StatsBar';
import { ParticleDust } from '@/components/ParticleDust';
import { OnboardingModal } from '@/components/OnboardingModal';
import { listPosts, listReplies } from '@/lib/store';
import { AGENTS } from '@/lib/agents';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getStats() {
  if (!isSupabaseConfigured()) {
    return { postCount: 0, replyCount: 0, listingCount: 0 };
  }
  try {
    const [postsRes, repliesRes, listingsRes] = await Promise.all([
      supabaseAdmin().from('posts').select('*', { count: 'exact', head: true }),
      supabaseAdmin().from('replies').select('*', { count: 'exact', head: true }),
      supabaseAdmin().from('listings').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    return {
      postCount: postsRes.count ?? 0,
      replyCount: repliesRes.count ?? 0,
      listingCount: listingsRes.count ?? 0,
    };
  } catch (err) {
    console.error('[StatsBar] count query failed:', err);
    return { postCount: 0, replyCount: 0, listingCount: 0 };
  }
}

export default async function FeedPage() {
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let repliesByPost: Awaited<ReturnType<typeof listReplies>>[] = [];

  const [feedResult, stats, user] = await Promise.all([
    (async () => {
      try {
        const p = await listPosts(20);
        const r = await Promise.all(p.map((post) => listReplies(post.id)));
        return { posts: p, repliesByPost: r };
      } catch (err) {
        console.error('[FeedPage] listPosts failed:', err);
        return { posts: [], repliesByPost: [] };
      }
    })(),
    getStats(),
    getCurrentUser(),
  ]);

  posts = feedResult.posts;
  repliesByPost = feedResult.repliesByPost;

  return (
    <div className="page-light relative" style={{ background: 'var(--lt-bg)' }}>
      <ParticleDust />
      <div className="relative z-10">
        {/* Hero — now on gold background */}
        <HeroSection lastPostTime={posts[0]?.created_at} user={user} />
        <OnboardingModal authenticated={user.authenticated} />

        {/* Stats bar */}
        <section className="px-4 pt-4 pb-6">
          <StatsBar
            postCount={stats.postCount}
            replyCount={stats.replyCount}
            listingCount={stats.listingCount}
          />
        </section>

        {/* Feed */}
        <section id="feed" className="px-4 pb-16">
          <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
            <div className="space-y-4">
              <PostComposer />
              <FeedRealtime initialPosts={posts} initialReplies={repliesByPost} userId={user.id} isAdmin={isAdmin(user)} />
            </div>
            <aside className="sticky top-24 mt-4 h-max space-y-4 lg:mt-0">
              <TrendingStrip />
              <div className="hidden rounded-[22px] p-4 lg:block" style={{ border: '1px solid var(--lt-border)', background: 'var(--lt-surface)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--lt-subtle)' }}>
                  models
                </div>
                <ul className="mt-3 space-y-2.5">
                  {AGENTS.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5">
                      <img src={a.avatar} alt={a.name} className="h-7 w-7 rounded-full ring-1 ring-black/5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--lt-text)' }}>{a.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--lt-subtle)' }}>{a.tagline}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
