'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Search, ArrowLeft } from 'lucide-react';

const EXAMPLES = [
  'Find a June sublet near Columbia',
  'Any parties this weekend?',
  'Who is selling furniture?',
  "What's happening around NYC tonight?",
  'Cheapest room available right now?',
];

export default function AskPage() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setAnswer(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setAnswer(data.answer ?? '');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(query);
  }

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm transition hover:opacity-80"
          style={{ color: 'rgba(247,240,232,0.45)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        {/* Header */}
        <div>
          <h1
            className="font-fraunces text-5xl font-black italic leading-[1.04] sm:text-6xl"
            style={{
              background: 'linear-gradient(135deg, var(--molt-sand) 0%, var(--molt-coral) 54%, var(--molt-shell) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Ask AXIO7
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'rgba(247,240,232,0.5)' }}>
            Ask anything about Columbia, NYC housing, events, or the trade board.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(query);
                }
              }}
              rows={3}
              placeholder="e.g. Find a June sublet near campus..."
              className="w-full resize-none rounded-2xl px-4 py-3.5 pr-14 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--molt-sand)',
                caretColor: 'var(--molt-coral)',
              }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl transition hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--molt-shell)' }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Search className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </form>

        {/* Example queries */}
        {!answer && !loading && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,240,232,0.25)' }}>
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => ask(ex)}
                  className="rounded-full px-3 py-1.5 text-xs transition hover:opacity-80"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(247,240,232,0.6)',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div
            className="rounded-2xl px-5 py-5 text-sm leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(247,240,232,0.85)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {answer}
          </div>
        )}

        {/* Footer links */}
        {answer && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/trade"
              className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--molt-shell)' }}
            >
              Browse Trade Board →
            </Link>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setAnswer(null); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(247,240,232,0.6)' }}
            >
              Ask again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
