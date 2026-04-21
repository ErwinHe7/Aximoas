'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import type { Bid, Listing } from '@/lib/types';
import { formatCents, timeAgo } from '@/lib/format';

const inputCls = "w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none";
const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--glass-border)',
  color: 'var(--molt-sand)',
  caretColor: 'var(--molt-shell)',
};

export function BidPanel({ listing, bids }: { listing: Listing; bids: Bid[] }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellerMode, setSellerMode] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter a positive bid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          bidder_name: name.trim() || 'Anonymous',
          amount_cents: Math.round(dollars * 100),
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'failed' }));
        setError(error);
        return;
      }
      setAmount('');
      setMessage('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const panelStyle = {
    background: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div className="space-y-4">
      {listing.status === 'open' ? (
        <form onSubmit={submit} className="space-y-3 rounded-[22px] p-4" style={panelStyle}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--molt-sand)' }}>Place a bid</h3>
            <label className="inline-flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'rgba(247,240,232,0.5)' }}>
              <input type="checkbox" checked={sellerMode} onChange={(e) => setSellerMode(e.target.checked)} className="accent-[var(--molt-shell)]" />
              I&apos;m the seller
            </label>
          </div>
          {!sellerMode && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} style={inputStyle} />
                <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (USD)" required className={inputCls} style={inputStyle} />
              </div>
              <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to the seller (optional)" className={inputCls} style={inputStyle} />
              {error && <div className="rounded-lg px-3 py-2 text-xs text-red-400" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>{error}</div>}
              <button disabled={submitting} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--molt-shell)' }}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit bid
              </button>
            </>
          )}
        </form>
      ) : (
        <div className="rounded-[22px] p-4 text-sm" style={{ ...panelStyle, color: 'rgba(247,240,232,0.5)' }}>
          This listing is {listing.status}. No new bids accepted.
        </div>
      )}

      <div className="rounded-[22px] p-4" style={panelStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--molt-sand)' }}>
          Bids{bids.length > 0 ? ` (${bids.length})` : ''}
        </h3>
        {bids.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: 'rgba(247,240,232,0.45)' }}>No bids yet. Be the first.</p>
        ) : (
          <ul className="mt-2 divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {bids.map((b, i) => (
              <BidRow key={b.id} bid={b} listing={listing} isTop={i === 0} sellerMode={sellerMode} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BidRow({ bid, listing, isTop, sellerMode }: { bid: Bid; listing: Listing; isTop: boolean; sellerMode: boolean }) {
  const [, start] = useTransition();
  const [accepting, setAccepting] = useState(false);
  const router = useRouter();

  function accept() {
    setAccepting(true);
    start(async () => {
      const res = await fetch(`/api/bids/${bid.id}/accept`, { method: 'POST' });
      if (res.ok) router.refresh();
      else setAccepting(false);
    });
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex-1">
        <div className="text-sm" style={{ color: 'var(--molt-sand)' }}>
          <span className="font-semibold">{bid.bidder_name}</span>{' '}
          {isTop && <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase" style={{ background: 'rgba(74,124,89,0.2)', color: '#4ade80' }}>Top</span>}
          {bid.status !== 'active' && <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(247,240,232,0.5)' }}>{bid.status}</span>}
        </div>
        {bid.message && <p className="text-xs mt-0.5" style={{ color: 'rgba(247,240,232,0.5)' }}>{bid.message}</p>}
        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(247,240,232,0.3)' }}>{timeAgo(bid.created_at)}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-sm font-bold font-mono" style={{ color: 'var(--molt-shell)' }}>
          {formatCents(bid.amount_cents, listing.currency)}
        </div>
        {sellerMode && listing.status === 'open' && bid.status === 'active' && (
          <button onClick={accept} disabled={accepting} className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--molt-shell)' }}>
            {accepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Accept
          </button>
        )}
      </div>
    </li>
  );
}
