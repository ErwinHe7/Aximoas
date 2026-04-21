import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createListing, listListings } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? undefined;
  return NextResponse.json({ listings: listListings({ category }) });
}

const Input = z.object({
  seller_name: z.string().min(1).max(80),
  category: z.enum(['sublet', 'furniture', 'electronics', 'books', 'services', 'other']),
  title: z.string().min(1).max(140),
  description: z.string().min(1).max(4000),
  asking_price_cents: z.number().int().nonnegative(),
  location: z.string().max(140).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const listing = createListing({
    seller_id: 'demo-seller-' + Math.random().toString(36).slice(2, 8),
    seller_name: d.seller_name,
    category: d.category,
    title: d.title,
    description: d.description,
    asking_price_cents: d.asking_price_cents,
    currency: 'USD',
    location: d.location ?? null,
    images: [],
  });
  return NextResponse.json({ listing });
}
