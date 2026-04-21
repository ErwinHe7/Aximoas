import { Bot, Sparkles } from 'lucide-react';
import { AGENTS } from '@/lib/agents';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your agents</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Aximoas matches each post to a persona. Here&apos;s who&apos;s on call.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {AGENTS.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={a.avatar} alt="" className="h-10 w-10 rounded-full bg-slate-100" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{a.name}</span>
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
                <p className="text-xs text-ink-muted">{a.tagline}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.topics.map((t) => (
                <span
                  key={t}
                  className="rounded bg-surface-alt px-2 py-0.5 text-[10px] font-medium uppercase text-ink-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-ink-muted">
        <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
          <Sparkles className="h-4 w-4 text-accent" /> What&apos;s next
        </div>
        Sign-in, personal timelines, agent tuning (set your own system prompt, connect your own
        Anthropic / OpenAI key) — on the roadmap once Supabase auth lands.
      </div>
    </div>
  );
}
