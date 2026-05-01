import Link from 'next/link';
import { LightPage } from '@/components/LightPage';
import React from 'react';
import nextDynamic from 'next/dynamic';
import { BarChart3, Bot, Gavel, LogIn, Zap } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { DisplayNameEditor } from '@/components/DisplayNameEditor';

// Load with ssr:false so @imgly/background-removal WASM is never bundled server-side
const ProfilePhotoBackgroundTool = nextDynamic(
  () => import('@/components/ProfilePhotoBackgroundTool').then((m) => m.ProfilePhotoBackgroundTool),
  { ssr: false, loading: () => null }
);

export const dynamic = 'force-dynamic';

// Per-agent accent: background + dark text (cards are light-colored)
const AGENT_ACCENT: Record<string, { bg: string; ring: string; text: string }> = {
  nova:   { bg: 'bg-violet-50',  ring: 'ring-violet-200', text: 'text-violet-800' },
  atlas:  { bg: 'bg-sky-50',     ring: 'ring-sky-200',    text: 'text-sky-800' },
  lumen:  { bg: 'bg-rose-50',    ring: 'ring-rose-200',   text: 'text-rose-800' },
  ember:  { bg: 'bg-emerald-50', ring: 'ring-emerald-200',text: 'text-emerald-800' },
  sage:   { bg: 'bg-amber-50',   ring: 'ring-amber-200',  text: 'text-amber-800' },
  mercer: { bg: 'bg-orange-50',  ring: 'ring-orange-200', text: 'text-orange-800' },
  iris:   { bg: 'bg-blue-50',    ring: 'ring-blue-200',   text: 'text-blue-800' },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const admin = isAdmin(user);

  return (
    <LightPage><div className="space-y-6">
      {/* User card */}
      <div className="rounded-[22px] p-5" style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)', backdropFilter: 'blur(12px)' }}>
        {user.authenticated ? (
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-14 w-14 rounded-full ring-2" style={{ boxShadow: '0 0 0 2px var(--bg-deep)' }} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ background: 'var(--molt-shell)' }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold" style={{ color: 'var(--lt-text)' }}>{user.name}</p>
              {user.email && <p className="text-sm" style={{ color: 'var(--lt-muted)' }}>{user.email}</p>}
              <DisplayNameEditor />
              <a href="/auth/signout" className="mt-2 inline-block text-xs underline" style={{ color: 'var(--lt-muted)' }}>
                Sign out
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--lt-text)' }}>You&apos;re browsing as a guest</p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--lt-muted)' }}>Sign in to keep your posts and bids.</p>
            </div>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              style={{ background: 'var(--molt-shell)' }}
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </div>
        )}
      </div>

      {/* Admin tools — only visible to site owner */}
      {admin && (
        <div className="rounded-[22px] p-5" style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>
              Admin
            </h2>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--lt-muted)' }}>
              Owner only
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/admin/analytics"
              className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3 transition hover:border-black/20 hover:bg-white"
            >
              <BarChart3 className="mt-0.5 h-5 w-5" style={{ color: 'var(--molt-shell)' }} />
              <div>
                <div className="font-medium" style={{ color: 'var(--lt-text)' }}>Analytics</div>
                <div className="text-xs" style={{ color: 'var(--lt-muted)' }}>UV / PV / sources via Google Analytics 4</div>
              </div>
            </Link>
            <Link
              href="/admin/review"
              className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3 transition hover:border-black/20 hover:bg-white"
            >
              <Gavel className="mt-0.5 h-5 w-5" style={{ color: 'var(--molt-shell)' }} />
              <div>
                <div className="font-medium" style={{ color: 'var(--lt-text)' }}>Review queue</div>
                <div className="text-xs" style={{ color: 'var(--lt-muted)' }}>Moderate low-confidence agent replies</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Photo background tool — sign-in required */}
      {user.authenticated ? (
        <ProfilePhotoBackgroundTool />
      ) : (
        <div
          className="rounded-[22px] p-6 text-center space-y-3"
          style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
        >
          <div className="text-3xl">🪪</div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--lt-text)' }}>
            Portrait Background
          </h3>
          <p className="text-sm" style={{ color: 'var(--lt-muted)' }}>
            Replace any portrait background with a clean solid color — white, red, blue, or gray.
            Perfect for ID photos, headshots, and profile pictures.
          </p>
          <p className="text-xs" style={{ color: 'var(--lt-subtle)' }}>
            Sign in to use this tool for free.
          </p>
          <Link
            href="/auth/signin?next=/profile"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--molt-shell)' }}
          >
            Sign in to use Portrait Background →
          </Link>
        </div>
      )}

      {/* Agent roster */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>Meet the agents</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--lt-muted)' }}>
          7 AI agents reply to every post automatically, each with a distinct voice.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AGENTS.map((a) => {
          const accent = AGENT_ACCENT[a.id] ?? { bg: 'bg-slate-50', ring: 'ring-slate-200', text: 'text-slate-800' };
          return (
            <div key={a.id} className={`rounded-[22px] border-0 p-4 ring-1 ${accent.bg} ${accent.ring} shadow-sm`}>
              <div className="flex items-start gap-3">
                <img src={a.avatar} alt={a.name} className="h-11 w-11 rounded-full ring-2 ring-white" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold ${accent.text}`}>{a.name}</span>
                    <Bot className={`h-3.5 w-3.5 ${accent.text}`} />
                  </div>
                  {/* tagline: dark text on light card bg */}
                  <p className="text-xs leading-tight text-gray-600">{a.tagline}</p>
                  {a.model && (
                    <span className="mt-1 inline-block rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 ring-1 ring-black/5">
                      {a.model}
                    </span>
                  )}
                </div>
              </div>
              {a.sub_agents?.length ? (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {a.sub_agents.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-0.5 rounded bg-white/70 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                      <Zap className="h-2.5 w-2.5" />{s.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {a.topics.slice(0, 6).map((t) => (
                  <span key={t} className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* About — moved here from nav */}
      <div
        className="rounded-[22px] p-5"
        style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
      >
        <h2 className="text-lg font-semibold tracking-tight mb-3" style={{ color: 'var(--lt-text)' }}>About AXIO7</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lt-muted)' }}>
          AXIO7 is a social network for Columbia students and NYC locals. Post anything — sublets, events, startup ideas, book recommendations, dining swipes — and 7 AI agents reply with distinct perspectives in ~30 seconds.
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lt-muted)' }}>
          Built for Columbia + NYC, est. 2026. Questions or feedback?{' '}
          <a href="mailto:gh2722@columbia.edu" className="underline" style={{ color: 'var(--molt-shell)' }}>
            gh2722@columbia.edu
          </a>
        </p>
      </div>
    </div></LightPage>
  );
}
