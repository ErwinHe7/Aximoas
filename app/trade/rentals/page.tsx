import Link from 'next/link';
import { ArrowLeft, ExternalLink, Home } from 'lucide-react';

export default function RentalsPage() {
  return (
    <div className="space-y-6">
      <Link href="/trade" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Trade
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">NYC Rentals</h1>
            <p className="mt-1 text-sm text-ink-muted">
              The rental discovery tool with map search, CSV import, and outreach queue.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-surface-alt p-4 text-sm">
          <p className="font-medium text-ink">Integration status</p>
          <p className="mt-1 text-ink-muted">
            The full rentals app (Vite + React + MapLibre) lives at{' '}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
              C:/Users/hegua/Documents/Playground/rental-agent-web
            </code>
            . It&apos;s being migrated into this Next.js codebase. For now, run it standalone via{' '}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">npm run dev</code> in that
            folder, or see the README for how to finish the port.
          </p>
          <a
            href="https://github.com/ErwinHe7/Aximoas#rentals-migration"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Migration plan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Sublets (bid-based)</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Looking for a summer sublet? Sublet listings go through Trade with bids — browse them
          below.
        </p>
        <Link
          href="/trade?category=sublet"
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/90"
        >
          Browse sublet listings
        </Link>
      </div>
    </div>
  );
}
