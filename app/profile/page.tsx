import Link from 'next/link';
import { LightPage } from '@/components/LightPage';
import React from 'react';
import { BarChart3, Bot, Gavel, LogIn, Zap } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { getCurrentUser, isAdmin } from '@/lib/auth';

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
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--lt-text)' }}>{user.name}</p>
              {user.email && <p className="text-sm" style={{ color: 'var(--lt-muted)' }}>{user.email}</p>}
              <a href="/auth/signout" className="mt-1 inline-block text-xs underline" style={{ color: 'var(--lt-muted)' }}>
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
    </div></LightPage>
  );
}
