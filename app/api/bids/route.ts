import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBid } from '@/lib/store';

const Input = z.object({
  listing_id: z.string().min(1),
  bidder_name: z.string().min(1).max(80),
  amount_cents: z.number().int().positive(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  const bid = createBid({
    listing_id: parsed.data.listing_id,
    bidder_name: parsed.data.bidder_name,
    amount_cents: parsed.data.amount_cents,
    message: parsed.data.message ?? null,
  });
  if (!bid) {
    return NextResponse.json({ error: 'listing not open or not found' }, { status: 400 });
  }
  return NextResponse.json({ bid });
}
