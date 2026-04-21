import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Tag } from 'lucide-react';
import { getListing, listBids } from '@/lib/store';
import { formatCents, timeAgo } from '@/lib/format';
import { BidPanel } from '@/components/BidPanel';

export const dynamic = 'force-dynamic';

export default function ListingDetail({ params }: { params: { id: string } }) {
  const listing = getListing(params.id);
  if (!listing) return notFound();
  const bids = listBids(listing.id);

  return (
    <div className="space-y-6">
      <Link href="/trade" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Trade
      </Link>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium">
            <Tag className="h-3 w-3" /> {listing.category}
          </span>
          <span className="text-ink-muted">{timeAgo(listing.created_at)}</span>
          {listing.location && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <MapPin className="h-3 w-3" /> {listing.location}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          by <span className="font-medium text-ink">{listing.seller_name}</span>
        </p>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">
          {listing.description}
        </p>
        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="text-xs text-ink-muted">Asking price</div>
            <div className="text-2xl font-semibold">
              {formatCents(listing.asking_price_cents, listing.currency)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-muted">Top bid</div>
            <div className="text-xl font-semibold">
              {listing.top_bid_cents != null
                ? formatCents(listing.top_bid_cents, listing.currency)
                : '—'}
            </div>
          </div>
        </div>
      </article>

      <BidPanel listing={listing} bids={bids} />
    </div>
  );
}
