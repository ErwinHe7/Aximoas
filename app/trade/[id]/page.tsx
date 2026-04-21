import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageSquare, Tag } from 'lucide-react';
import { getListing, listBids, getTransactionByListing } from '@/lib/store';
import { formatCents, timeAgo } from '@/lib/format';
import { BidPanel } from '@/components/BidPanel';

export const dynamic = 'force-dynamic';

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  if (!listing) return notFound();
  const [bids, transaction] = await Promise.all([
    listBids(listing.id),
    getTransactionByListing(listing.id),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/trade" className="inline-flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'rgba(247,240,232,0.6)' }}>
        <ArrowLeft className="h-4 w-4" /> Back to Trade
      </Link>

      <article className="rounded-[22px] p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(247,240,232,0.5)' }}>
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--molt-sand)' }}>
            <Tag className="h-3 w-3" /> {listing.category}
          </span>
          <span>{timeAgo(listing.created_at)}</span>
          {listing.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {listing.location}
            </span>
          )}
          <span className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            listing.status === 'open' ? 'bg-emerald-900/40 text-emerald-400' :
            listing.status === 'pending' ? 'bg-amber-900/40 text-amber-400' :
            listing.status === 'sold' ? 'bg-slate-700 text-slate-300' : 'bg-red-900/40 text-red-400'
          }`}>
            {listing.status}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--molt-sand)' }}>{listing.title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(247,240,232,0.5)' }}>
          by <span className="font-medium" style={{ color: 'var(--molt-sand)' }}>{listing.seller_name}</span>
        </p>

        {listing.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {listing.images.map((src) => (
              <img key={src} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" style={{ border: '1px solid var(--glass-border)' }} />
            ))}
          </div>
        )}

        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: 'rgba(247,240,232,0.85)' }}>
          {listing.description}
        </p>

        <div className="mt-5 flex items-end justify-between border-t pt-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div>
            <div className="text-xs" style={{ color: 'rgba(247,240,232,0.45)' }}>Asking price</div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--molt-shell)' }}>
              {formatCents(listing.asking_price_cents, listing.currency)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'rgba(247,240,232,0.45)' }}>Top bid</div>
            <div className="text-xl font-semibold" style={{ color: 'var(--molt-sand)' }}>
              {listing.top_bid_cents != null ? formatCents(listing.top_bid_cents, listing.currency) : '—'}
            </div>
          </div>
        </div>
      </article>

      {transaction && (
        <Link
          href={`/trade/${listing.id}/thread?tx=${transaction.id}`}
          className="flex items-center justify-between rounded-[22px] px-4 py-3 text-sm transition hover:opacity-90"
          style={{ background: 'rgba(216,71,39,0.12)', border: '1px solid rgba(216,71,39,0.3)', color: 'var(--molt-coral)' }}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <MessageSquare className="h-4 w-4" />
            Active deal with {transaction.buyer_name} ({formatCents(transaction.amount_cents, 'USD')})
          </span>
          <span className="text-xs opacity-70">Open thread →</span>
        </Link>
      )}

      <BidPanel listing={listing} bids={bids} />
    </div>
  );
}
