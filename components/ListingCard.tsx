import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { formatCents, timeAgo } from '@/lib/format';

const CAT_EMOJI: Record<Listing['category'], string> = {
  sublet:      '🏠',
  furniture:   '🛋️',
  electronics: '📱',
  books:       '📚',
  services:    '🛠️',
  tickets:     '🎟️',
  tutoring:    '🎓',
  other:       '📦',
};

const STATUS_STYLE: Record<Listing['status'], { bg: string; text: string }> = {
  open:      { bg: 'rgba(74,124,89,0.2)',  text: '#4A7C59' },
  pending:   { bg: 'rgba(245,158,11,0.2)', text: '#F59E0B' },
  sold:      { bg: 'rgba(255,255,255,0.1)', text: 'rgba(247,240,232,0.4)' },
  withdrawn: { bg: 'rgba(216,71,39,0.15)', text: 'rgba(216,71,39,0.7)' },
};

export function ListingCard({ listing }: { listing: Listing }) {
  const emoji = CAT_EMOJI[listing.category];
  const hasImage = listing.images.length > 0;
  const status = STATUS_STYLE[listing.status];

  return (
    <Link
      href={`/trade/${listing.id}`}
      className="listing-card group block overflow-hidden rounded-[20px] transition-all duration-200"
      style={{
        background: 'var(--lt-surface)',
        border: '1px solid var(--lt-border)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
      }}
    >
      <style>{`
        .listing-card:hover {
          border-color: rgba(216,71,39,0.35);
          box-shadow: 0 8px 32px var(--glow-shell);
          transform: translateY(-2px);
        }
      `}</style>

      {hasImage ? (
        <div className="relative h-44 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {listing.images.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              +{listing.images.length - 1}
            </span>
          )}
          <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur"
            style={{ background: 'rgba(10,21,32,0.7)', color: 'var(--lt-text)', border: '1px solid var(--lt-border)' }}>
            {emoji} {listing.category}
          </span>
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center text-4xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {emoji}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2">
          {!hasImage && <span className="text-[11px]" style={{ color: 'var(--lt-muted)' }}>{emoji} {listing.category}</span>}
          {listing.status !== 'open' && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ background: status.bg, color: status.text }}>
              {listing.status}
            </span>
          )}
          <span className="ml-auto text-[11px]" style={{ color: 'var(--lt-muted)' }}>{timeAgo(listing.created_at)}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug" style={{ color: 'var(--lt-text)' }}>
          {listing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--lt-muted)' }}>
          {listing.description}
        </p>

        <div className="mt-3 flex items-end justify-between border-t pt-3" style={{ borderColor: 'var(--lt-border)' }}>
          <div>
            <div className="text-xl font-bold font-mono" style={{ color: 'var(--molt-shell)' }}>
              {formatCents(listing.asking_price_cents, listing.currency)}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--lt-muted)' }}>
              {listing.bid_count > 0
                ? `${listing.bid_count} bid${listing.bid_count > 1 ? 's' : ''} · top ${formatCents(listing.top_bid_cents ?? 0, listing.currency)}`
                : 'No bids yet'}
            </div>
          </div>
          {listing.location && (
            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--lt-muted)' }}>
              <MapPin className="h-3 w-3" />{listing.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
