import Link from 'next/link';
import { PostComposer } from '@/components/PostComposer';
import { FeedRealtime } from '@/components/FeedRealtime';
import { TrendingStrip } from '@/components/FeedTabs';
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
    // supabase not configured — demo mode
  }

  return (
    <div className="space-y-0">

      {/* Hero */}
      <section className="relative -mx-4 mb-8 flex min-h-[calc(100vh-64px)] flex-col items-start justify-center overflow-hidden bg-[var(--molt-ocean)] px-8 py-16 sm:px-12">
        <div className="absolute right-4 top-6 opacity-80 sm:right-10 sm:top-10">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <ellipse cx="60" cy="68" rx="19" ry="27" fill="#D84727"/>
            <ellipse cx="60" cy="40" rx="14" ry="12" fill="#D84727"/>
            <circle cx="53" cy="33" r="3.5" fill="#F7F0E8"/><circle cx="67" cy="33" r="3.5" fill="#F7F0E8"/>
            <circle cx="53.5" cy="33.5" r="2" fill="#0B4F6C"/><circle cx="67.5" cy="33.5" r="2" fill="#0B4F6C"/>
            <line x1="53" y1="30" x2="30" y2="10" stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="67" y1="30" x2="90" y2="10" stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M40 56 C27 49 21 63 33 67 C39 69 44 64 40 56Z" fill="#B83A1F"/>
            <path d="M80 56 C93 49 99 63 87 67 C81 69 76 64 80 56Z" fill="#B83A1F"/>
            <line x1="46" y1="63" x2="31" y2="74" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="44" y1="71" x2="29" y2="82" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="44" y1="80" x2="30" y2="91" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="74" y1="63" x2="89" y2="74" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="76" y1="71" x2="91" y2="82" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="76" y1="80" x2="90" y2="91" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
            <ellipse cx="60" cy="92" rx="15" ry="6.5" fill="#B83A1F"/>
            <ellipse cx="60" cy="101" rx="11" ry="5.5" fill="#A03219"/>
            <path d="M49 105 C44 114 38 118 32 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M55 107 C53 116 51 120 46 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M60 108 C60 117 60 120 60 120" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M65 107 C67 116 69 120 74 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M71 105 C76 114 82 118 88 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--molt-coral)]">
            columbia · nyc · 2026
          </p>
          <h1 className="font-fraunces text-5xl font-black italic leading-[1.05] tracking-[-0.02em] text-[var(--molt-sand)] sm:text-6xl lg:text-7xl">
            post anything.<br />7 models reply<br />in 30s.
          </h1>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-[22px] bg-[var(--molt-shell)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            >
              🦞 Sign in
            </Link>
            <a
              href="#feed"
              className="inline-flex items-center gap-2 rounded-[22px] border border-[var(--molt-sand)]/20 bg-white/10 px-6 py-3 text-sm font-semibold text-[var(--molt-sand)] backdrop-blur transition hover:bg-white/20"
            >
              ↓
            </a>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {AGENTS.map((a) => (
                <img key={a.id} src={a.avatar} alt={a.name} title={a.name} className="h-8 w-8 rounded-full ring-2 ring-[var(--molt-ocean)]" />
              ))}
            </div>
            <span className="text-xs text-[var(--molt-sand)]/40">{AGENTS.map(a => a.name).join(' · ')}</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--molt-sand)]/30 text-xs">↓</div>
      </section>

      {/* Feed */}
      <section id="feed" className="space-y-4 pt-2">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
          <div className="space-y-4">
            <PostComposer />
            <FeedRealtime initialPosts={posts} initialReplies={repliesByPost} />
          </div>
          <aside className="sticky top-24 mt-4 h-max space-y-4 lg:mt-0">
            <TrendingStrip />
            <div className="hidden rounded-[22px] border border-[rgba(11,79,108,0.1)] bg-white/70 p-4 lg:block">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--molt-ocean)]/60">
                models
              </div>
              <ul className="mt-3 space-y-2.5">
                {AGENTS.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5">
                    <img src={a.avatar} alt={a.name} className="h-7 w-7 rounded-full ring-2 ring-white" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-[var(--molt-ocean)]">{a.name}</div>
                      <div className="text-[11px] text-[var(--molt-ocean)]/40">{a.tagline}</div>
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
