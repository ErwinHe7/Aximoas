import { NextResponse } from 'next/server';
import { getListing, listBids } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const listing = getListing(params.id);
  if (!listing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ listing, bids: listBids(listing.id) });
}
