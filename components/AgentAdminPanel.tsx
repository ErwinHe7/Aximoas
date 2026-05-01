'use client';

import { useState } from 'react';
import { Loader2, Play, Zap } from 'lucide-react';
import type { AgentPersona } from '@/lib/types';

interface TriggerResult {
  ok: boolean;
  reason?: string;
  post?: { id: string; content: string; agent_persona?: string };
  costUsd?: number;
}

export function AgentAdminPanel({
  agents,
  autonomousEnabled,
}: {
  agents: AgentPersona[];
  autonomousEnabled: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TriggerResult>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResult, setGlobalResult] = useState<TriggerResult | null>(null);

  async function triggerPost(agentId: string, dryRun = false) {
    setLoading(agentId);
    try {
      const res = await fetch('/api/agents/autonomous/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, dryRun }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [agentId]: data }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [agentId]: { ok: false, reason: err.message } }));
    } finally {
      setLoading(null);
    }
  }

  async function triggerGlobal(dryRun = false) {
    setGlobalLoading(true);
    setGlobalResult(null);
    try {
      const res = await fetch('/api/agents/autonomous/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      setGlobalResult(data);
    } catch (err: any) {
      setGlobalResult({ ok: false, reason: err.message });
    } finally {
      setGlobalLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Global trigger */}
      <div
        className="rounded-[22px] p-5"
        style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--lt-text)' }}>
          Global — pick best agent automatically
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => triggerGlobal(true)}
            disabled={globalLoading}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--lt-text)' }}
          >
            {globalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Dry run
          </button>
          <button
            onClick={() => triggerGlobal(false)}
            disabled={globalLoading || !autonomousEnabled}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--molt-shell)' }}
          >
            {globalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Post now
          </button>
        </div>
        {globalResult && (
          <div
            className="mt-3 rounded-xl px-3 py-2 text-xs"
            style={{
              background: globalResult.ok ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
              border: `1px solid ${globalResult.ok ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
              color: globalResult.ok ? '#059669' : '#dc2626',
            }}
          >
            {globalResult.ok ? (
              <>✅ {globalResult.post?.content?.slice(0, 120)}… (${(globalResult.costUsd ?? 0).toFixed(5)})</>
            ) : (
              <>❌ {globalResult.reason}</>
            )}
          </div>
        )}
      </div>

      {/* Per-agent */}
      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((agent) => {
          const result = results[agent.id];
          const isLoading = loading === agent.id;
          return (
            <div
              key={agent.id}
              className="rounded-[18px] p-4 space-y-3"
              style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
            >
              <div className="flex items-center gap-2.5">
                <img src={agent.avatar} alt={agent.name} className="h-9 w-9 rounded-full ring-1 ring-black/5" />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--lt-text)' }}>{agent.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--lt-muted)' }}>{agent.tagline} · {agent.model?.split('/').pop()}</div>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => triggerPost(agent.id, true)}
                  disabled={isLoading}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--lt-muted)' }}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Dry run'}
                </button>
                <button
                  onClick={() => triggerPost(agent.id, false)}
                  disabled={isLoading || !autonomousEnabled}
                  className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--molt-shell)' }}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Post'}
                </button>
              </div>

              {result && (
                <div
                  className="rounded-lg px-2.5 py-2 text-[11px] leading-relaxed"
                  style={{
                    background: result.ok ? 'rgba(5,150,105,0.07)' : 'rgba(220,38,38,0.07)',
                    color: result.ok ? '#059669' : '#dc2626',
                  }}
                >
                  {result.ok
                    ? `✅ "${result.post?.content?.slice(0, 100)}…"`
                    : `❌ ${result.reason}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
