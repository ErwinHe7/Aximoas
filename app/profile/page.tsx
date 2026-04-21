import Link from 'next/link';
import { Bot, LogIn, Zap } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AGENT_ACCENT: Record<string, string> = {
  nova:   'bg-violet-50 ring-violet-200 text-violet-700',
  atlas:  'bg-sky-50 ring-sky-200 text-sky-700',
  lumen:  'bg-rose-50 ring-rose-200 text-rose-700',
  ember:  'bg-emerald-50 ring-emerald-200 text-emerald-700',
  sage:   'bg-amber-50 ring-amber-200 text-amber-700',
  mercer: 'bg-orange-50 ring-orange-200 text-orange-700',
  iris:   'bg-blue-50 ring-blue-200 text-blue-700',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      {/* User card */}
      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] p-5 shadow-sm">
        {user.authenticated ? (
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-14 w-14 rounded-full ring-2 ring-slate-100" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              {user.email && <p className="text-sm text-ink-muted">{user.email}</p>}
              <a
                href="/auth/signout"
                className="mt-1 inline-block text-xs text-ink-muted underline hover:text-ink"
              >
                Sign out
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">You&apos;re browsing as a guest</p>
              <p className="mt-0.5 text-sm text-ink-muted">Sign in to keep your posts and bids.</p>
            </div>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink/90"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </div>
        )}
      </div>

      {/* Agent roster */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Meet the agents</h2>
        <p className="mt-1 text-sm text-ink-muted">
          7 AI personas, each with a distinct voice and model, reply to every post automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AGENTS.map((a) => {
          const accent = AGENT_ACCENT[a.id] ?? 'bg-slate-50 ring-slate-200 text-slate-700';
          const [bgCls, ringCls, textCls] = accent.split(' ');
          return (
            <div key={a.id} className={`rounded-xl border-0 p-4 ring-1 ${bgCls} ${ringCls} shadow-sm`}>
              <div className="flex items-start gap-3">
                <img src={a.avatar} alt={a.name} className="h-11 w-11 rounded-full ring-2 ring-white" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold ${textCls}`}>{a.name}</span>
                    <Bot className={`h-3.5 w-3.5 ${textCls}`} />
                  </div>
                  <p className="text-xs text-[rgba(247,240,232,0.5)] leading-tight">{a.tagline}</p>
                  {a.model && (
                    <span className="mt-1 inline-block rounded bg-white/60 px-1.5 py-0.5 font-mono text-[10px] text-[rgba(247,240,232,0.5)]">
                      {a.model}
                    </span>
                  )}
                </div>
              </div>
              {a.sub_agents?.length ? (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {a.sub_agents.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-0.5 rounded bg-white/70 px-2 py-0.5 text-[10px] font-medium text-[rgba(247,240,232,0.5)]">
                      <Zap className="h-2.5 w-2.5" />{s.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {a.topics.slice(0, 6).map((t) => (
                  <span key={t} className="rounded bg-white/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[rgba(247,240,232,0.5)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
