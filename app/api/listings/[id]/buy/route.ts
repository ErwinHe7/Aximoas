import { NextResponse } from 'next/server';
import { z } from 'zod';
import { acceptBid, createBid, getListing } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { sendTradeConnectionEmails } from '@/lib/trade-email';

export const runtime = 'nodejs';

const Input = z.object({
  buyer_name: z.string().min(1).max(80),
  buyer_email: z.string().email().max(200).optional(),
  buyer_contact: z.string().max(200).optional(),
  amount_cents: z.number().int().positive().optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', detail: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const listing = await getListing(params.id);
    if (!listing || listing.status !== 'open') {
      return NextResponse.json({ error: 'listing not open or not found' }, { status: 400 });
    }
    if (!listing.seller_email) {
      return NextResponse.json({ error: 'seller email is missing for this listing' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: 'seller cannot buy their own listing' }, { status: 400 });
    }

    const buyerEmail = parsed.data.buyer_email?.trim() || user.email;
    if (!buyerEmail) {
      return NextResponse.json({ error: 'buyer email is required' }, { status: 400 });
    }

    const bid = await createBid({
      listing_id: listing.id,
      bidder_id: user.id,
      bidder_name: parsed.data.buyer_name.trim() || user.name,
      bidder_email: buyerEmail,
      bidder_contact: parsed.data.buyer_contact?.trim() || null,
      amount_cents: parsed.data.amount_cents ?? listing.asking_price_cents,
      message: parsed.data.message?.trim() || 'Buyer clicked I want to buy.',
    });

    if (!bid) {
      return NextResponse.json({ error: 'could not create purchase offer' }, { status: 400 });
    }

    const result = await acceptBid(bid.id);
    if (!result) {
      return NextResponse.json({ error: 'could not create trade connection' }, { status: 400 });
    }

    const email = await sendTradeConnectionEmails(result);
    return NextResponse.json({ bid, ...result, email });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
}
