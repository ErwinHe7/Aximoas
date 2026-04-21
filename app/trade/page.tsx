import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { Plus, Home, Sofa, Smartphone, BookOpen, Hammer, Package, Ticket, GraduationCap } from 'lucide-react';
import { listListings } from '@/lib/store';
import { ListingCard } from '@/components/ListingCard';
import 'maplibre-gl/dist/maplibre-gl.css';

const RentalsApp = nextDynamic(() => import('@/components/rentals/RentalsApp'), { ssr: false });

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { id: 'sublet',      label: 'Sublets',     icon: Home },
  { id: 'furniture',   label: 'Furniture',   icon: Sofa },
  { id: 'electronics', label: 'Electronics', icon: Smartphone },
  { id: 'books',       label: 'Books',       icon: BookOpen },
  { id: 'tickets',     label: 'Tickets',     icon: Ticket },
  { id: 'tutoring',    label: 'Tutoring',    icon: GraduationCap },
  { id: 'services',    label: 'Services',    icon: Hammer },
  { id: 'other',       label: 'Other',       icon: Package },
] as const;

export default async function TradePage({
  searchParams,
}: {
  searchParams?: { category?: string; view?: string };
}) {
  const category = searchParams?.category;
  const view = searchParams?.view ?? 'market';

  let listings: Awaited<ReturnType<typeof listListings>> = [];
  try {
    listings = await listListings({ category });
  } catch {
    // demo mode
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <h1
          className="font-fraunces font-black italic leading-none tracking-tight"
          style={{
            fontSize: 'clamp(3.5rem, 10vw, 7rem)',
            background: 'linear-gradient(135deg, var(--molt-shell) 0%, var(--molt-coral) 50%, var(--molt-sand) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          trade.
        </h1>
        <Link
          href="/trade/new"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: 'var(--molt-shell)' }}
        >
          <Plus className="h-4 w-4" /> Post
        </Link>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        {[
          { href: '/trade?view=market', label: 'Marketplace', id: 'market' },
          { href: '/trade?view=rentals', label: '🗺 Rental Map', id: 'rentals' },
        ].map((v) => (
          <Link
            key={v.id}
            href={v.href}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition"
            style={view === v.id ? {
              background: 'var(--molt-shell)',
              color: 'white',
              boxShadow: '0 0 10px var(--glow-shell)',
            } : {
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'rgba(247,240,232,0.5)',
            }}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {view === 'rentals' ? (
        <RentalsApp />
      ) : (
        <>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/trade"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
              style={!category ? {
                background: 'var(--molt-shell)',
                color: 'white',
                boxShadow: '0 0 8px var(--glow-shell)',
              } : {
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'rgba(247,240,232,0.5)',
              }}
            >
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/trade?category=${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
                style={category === c.id ? {
                  background: 'var(--molt-shell)',
                  color: 'white',
                  boxShadow: '0 0 8px var(--glow-shell)',
                } : {
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  color: 'rgba(247,240,232,0.5)',
                }}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </Link>
            ))}
          </div>

          {listings.length === 0 ? (
            <div
              className="rounded-[20px] border-dashed p-14 text-center"
              style={{ border: '1px dashed var(--glass-border)', background: 'var(--glass)' }}
            >
              <div className="text-4xl">📭</div>
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--molt-sand)' }}>
                No listings yet{category ? ` in ${category}` : ''}
              </p>
              <Link
                href="/trade/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--molt-shell)' }}
              >
                <Plus className="h-4 w-4" /> Post a listing
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
