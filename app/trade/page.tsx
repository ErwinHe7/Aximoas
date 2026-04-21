import Link from 'next/link';
import { Home as HomeIcon, Plus, Sofa, Smartphone, BookOpen, Hammer, Package } from 'lucide-react';
import { listListings } from '@/lib/store';
import { ListingCard } from '@/components/ListingCard';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { id: 'sublet', label: 'Sublets', icon: HomeIcon, href: '/trade?category=sublet' },
  { id: 'rentals', label: 'Rentals', icon: HomeIcon, href: '/trade/rentals' },
  { id: 'furniture', label: 'Furniture', icon: Sofa, href: '/trade?category=furniture' },
  { id: 'electronics', label: 'Electronics', icon: Smartphone, href: '/trade?category=electronics' },
  { id: 'books', label: 'Books', icon: BookOpen, href: '/trade?category=books' },
  { id: 'services', label: 'Services', icon: Hammer, href: '/trade?category=services' },
  { id: 'other', label: 'Other', icon: Package, href: '/trade?category=other' },
] as const;

export default function TradePage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const category = searchParams?.category;
  const listings = listListings({ category });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Post anything you want to sell, sublet, or swap. Others place bids — you pick the winner.
          </p>
        </div>
        <Link
          href="/trade/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white transition hover:bg-ink/90"
        >
          <Plus className="h-4 w-4" /> New listing
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center text-xs transition ${
              category === c.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink-muted hover:border-ink/30 hover:text-ink'
            }`}
          >
            <c.icon className="h-4 w-4" />
            {c.label}
          </Link>
        ))}
      </div>

      {category && (
        <div className="text-sm text-ink-muted">
          Filtered by <span className="font-medium text-ink">{category}</span> ·{' '}
          <Link href="/trade" className="underline">
            clear
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {listings.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-ink-muted">
            No listings in this category yet.
          </div>
        )}
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
