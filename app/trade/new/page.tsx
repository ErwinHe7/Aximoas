import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ListingComposer } from '@/components/ListingComposer';

export default function NewListingPage() {
  return (
    <div className="space-y-4">
      <Link href="/trade" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Trade
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
      <p className="text-sm text-ink-muted">
        Anyone on AXIO7 can place a bid on your listing. You accept the one you like.
      </p>
      <ListingComposer />
    </div>
  );
}
