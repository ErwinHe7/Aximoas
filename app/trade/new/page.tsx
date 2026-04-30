import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ListingComposer } from '@/components/ListingComposer';
import { LightPage } from '@/components/LightPage';
import { getCurrentUser } from '@/lib/auth';

export default async function NewListingPage() {
  const user = await getCurrentUser();

  return (
    <LightPage>
      <div className="space-y-4">
        <Link href="/trade" className="inline-flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'var(--lt-muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to Trade
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>New listing</h1>
        <p className="text-sm" style={{ color: 'var(--lt-muted)' }}>
          Buyers can place offers or start a direct purchase connection by email.
        </p>
        <ListingComposer initialSellerName={user.name} initialSellerEmail={user.email} />
      </div>
    </LightPage>
  );
}
