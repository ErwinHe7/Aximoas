'use client';

import { Flame, Heart, MessageCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Post } from '@/lib/types';

export type FeedTab =
  | 'all'
  | 'hot'
  | 'sublet'
  | 'events'
  | 'founders'
  | 'marketplace'
  | 'dining'
  | 'nyc';

const TABS: { id: FeedTab; label: string; keywords: string[] }[] = [
  { id: 'all',         label: '✨ All',         keywords: [] },
  { id: 'hot',         label: '🔥 Hot',         keywords: [] },
  { id: 'sublet',      label: '🏠 Sublet',      keywords: ['sublet', 'sublease', 'rent', 'room', 'apartment', 'roommate', 'lease', 'housing', '转租', '找房', '房'] },
  { id: 'events',      label: '🎉 Events',      keywords: ['party', 'event', 'concert', 'tonight', 'weekend', 'happening', 'show', 'gallery', 'museum', 'mixer', 'meetup', '活动', '派对'] },
  { id: 'founders',    label: '💼 Founders',    keywords: ['founder', 'startup', 'vc', 'fundraise', 'investor', 'pitch', 'pmf', 'mvp', 'launch', 'build', 'ship', '创业'] },
  { id: 'marketplace', label: '🛒 Marketplace', keywords: ['sell', 'selling', 'buy', 'trade', 'furniture', 'desk', 'chair', 'couch', 'sofa', 'ikea', 'iphone', 'macbook', 'laptop', 'electronics', 'used'] },
  { id: 'dining',      label: '🍱 Dining',      keywords: ['dining', 'swipe', 'meal', 'food', 'eat', 'columbia dining', 'dining plan', '饭卡', '餐'] },
  { id: 'nyc',         label: '🗽 NYC',         keywords: ['nyc', 'new york', 'manhattan', 'brooklyn', 'queens', 'subway', 'columbia', 'nyu', 'harlem', 'morningside'] },
];

export function FeedTabs({ value, onChange }: { value: FeedTab; onChange: (t: FeedTab) => void }) {
  return (
    <div className="sticky top-[57px] z-20 -mx-4 overflow-x-auto px-4 py-2.5 backdrop-blur-lg" style={{ background: 'rgba(247,240,232,0.95)', borderBottom: '1px solid var(--lt-border)' }}>
      <div className="flex items-center gap-1.5">
        {TABS.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition"
              style={active ? {
                background: 'var(--molt-shell)',
                color: 'white',
                boxShadow: '0 0 12px var(--glow-shell)',
              } : {
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid var(--lt-border)',
                color: 'var(--lt-muted)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function filterByTab<T extends { content: string; like_count: number; reply_count: number; created_at: string }>(
  posts: T[],
  tab: FeedTab,
): T[] {
  if (tab === 'all') return posts;
  if (tab === 'hot') {
    return [...posts].sort((a, b) => {
      const scoreA = a.like_count * 2 + a.reply_count;
      const scoreB = b.like_count * 2 + b.reply_count;
      return scoreB - scoreA;
    });
  }
  const tabDef = TABS.find((t) => t.id === tab);
  if (!tabDef || tabDef.keywords.length === 0) return posts;
  return posts.filter((p) => {
    const text = p.content.toLowerCase();
    return tabDef.keywords.some((k) => text.includes(k));
  });
}

export function TrendingStrip() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof supabaseBrowser>['channel']> | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/trending', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.posts)) setPosts(json.posts);
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();

    // Fallback poll every 60 s
    const interval = setInterval(fetchTrending, 60_000);

    // Supabase realtime: re-fetch on any like or reply event
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel('trending-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, fetchTrending)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'replies' }, fetchTrending)
      .subscribe();
    channelRef.current = ch;

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [fetchTrending]);

  const isLive = !loading && posts.length > 0;

  return (
    <div className="hidden rounded-[22px] p-4 lg:block" style={{ border: '1px solid var(--lt-border)', background: 'var(--lt-surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>
          <Flame className="h-3.5 w-3.5" />
          trending
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: isLive ? '#22c55e' : 'var(--lt-border)',
              boxShadow: isLive ? '0 0 6px #22c55e' : 'none',
              animation: isLive ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
            }}
          />
          <span className="text-[10px] font-medium" style={{ color: isLive ? '#22c55e' : 'var(--lt-muted)' }}>
            Live
          </span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ul className="mt-3 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded" style={{ background: 'var(--lt-border)', opacity: 0.5 }} />
              <span className="h-3 flex-1 rounded" style={{ background: 'var(--lt-border)', opacity: 0.4 }} />
            </li>
          ))}
        </ul>
      ) : posts.length === 0 ? (
        <p className="mt-3 text-[12px]" style={{ color: 'var(--lt-muted)' }}>No posts yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {posts.map((p, i) => {
            const pinned = (p as any).pinned as boolean | undefined;
            const snippet = p.content.length > 60 ? p.content.slice(0, 60) + '…' : p.content;
            const authorShort = p.author_name.length > 14 ? p.author_name.slice(0, 13) + '…' : p.author_name;
            return (
              <li
                key={p.id}
                onClick={() => router.push(`/post/${p.id}`)}
                className="group flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 transition-colors"
                style={{ '--hover-bg': 'rgba(0,0,0,0.04)' } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Rank number */}
                <span
                  className="mt-0.5 w-4 flex-shrink-0 text-[11px] font-bold"
                  style={{ color: i === 0 ? 'var(--molt-shell)' : 'var(--lt-muted)' }}
                >
                  {i + 1}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--lt-fg)' }}>
                      {authorShort}
                    </span>
                    {pinned && (
                      <span title="Pinned" className="text-[11px]">🔥</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--lt-muted)' }}>
                    {snippet}
                  </p>
                  {/* Stats row */}
                  <div className="mt-1 flex items-center gap-2.5">
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--lt-muted)' }}>
                      <Heart className="h-2.5 w-2.5" />
                      {p.like_count}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--lt-muted)' }}>
                      <MessageCircle className="h-2.5 w-2.5" />
                      {p.reply_count}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
