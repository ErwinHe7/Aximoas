import Link from 'next/link';
import { MapPin, Tag } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { formatCents, timeAgo } from '@/lib/format';

const CATEGORY_COLOR: Record<Listing['category'], string> = {
  sublet: 'bg-blue-50 text-blue-700',
  furniture: 'bg-amber-50 text-amber-700',
  electronics: 'bg-violet-50 text-violet-700',
  books: 'bg-emerald-50 text-emerald-700',
  services: 'bg-pink-50 text-pink-700',
  other: 'bg-slate-100 text-slate-700',
};

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/trade/${listing.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-ink/20 hover:shadow"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[listing.category]}`}>
          <Tag className="h-3 w-3" />
          {listing.category}
        </span>
        <span className="text-xs text-ink-muted">{timeAgo(listing.created_at)}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight">{listing.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{listing.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {formatCents(listing.asking_price_cents, listing.currency)}
          </div>
          <div className="text-xs text-ink-muted">
            {listing.bid_count > 0
              ? `${listing.bid_count} bid${listing.bid_count === 1 ? '' : 's'} · top ${formatCents(listing.top_bid_cents ?? 0, listing.currency)}`
              : 'No bids yet'}
          </div>
        </div>
        {listing.location && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <MapPin className="h-3 w-3" />
            {listing.location}
          </span>
        )}
      </div>
    </Link>
  );
}
