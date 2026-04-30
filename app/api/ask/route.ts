import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chat } from '@/lib/llm';
import { listListings, listPosts } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  query: z.string().min(1).max(500),
});

const HOUSING_KW = ['sublet', 'rent', 'room', 'apartment', 'sublease', 'housing', 'roommate', '转租', '找房'];
const EVENT_KW   = ['party', 'event', 'concert', 'show', 'gallery', 'tonight', 'weekend', '活动'];
const FURNITURE_KW = ['furniture', 'desk', 'chair', 'couch', 'sofa', 'ikea', 'sell', 'selling'];

function matchesAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { query } = parsed.data;

  // Gather context: matching listings and recent posts
  const contextParts: string[] = [];

  try {
    const isHousing   = matchesAny(query, HOUSING_KW);
    const isEvent     = matchesAny(query, EVENT_KW);
    const isFurniture = matchesAny(query, FURNITURE_KW);

    const [listings, posts] = await Promise.all([
      listListings({ category: isHousing ? 'sublet' : isFurniture ? 'furniture' : undefined }),
      listPosts(20),
    ]);

    const openListings = listings.filter((l) => l.status === 'open').slice(0, 6);
    if (openListings.length > 0) {
      const lines = openListings.map((l) => {
        const price = l.asking_price_cents > 0 ? `$${(l.asking_price_cents / 100).toFixed(0)}` : 'price TBD';
        const loc = l.location ? ` · ${l.location}` : '';
        return `• [${l.title}](${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/trade/${l.id}) — ${price}${loc}`;
      });
      contextParts.push(`Current listings on AXIO7:\n${lines.join('\n')}`);
    }

    const relevantPosts = posts
      .filter((p) => {
        const lc = p.content.toLowerCase();
        return (
          (isHousing && HOUSING_KW.some((k) => lc.includes(k))) ||
          (isEvent && EVENT_KW.some((k) => lc.includes(k))) ||
          (isFurniture && FURNITURE_KW.some((k) => lc.includes(k)))
        );
      })
      .slice(0, 4);

    if (relevantPosts.length > 0) {
      const lines = relevantPosts.map(
        (p) => `• "${p.content.slice(0, 120)}" — posted by ${p.author_name}`
      );
      contextParts.push(`Recent community posts:\n${lines.join('\n')}`);
    }
  } catch {
    // proceed without context if store fails
  }

  const contextBlock = contextParts.length > 0
    ? `\n\n[AXIO7 Live Data]\n${contextParts.join('\n\n')}`
    : '';

  const systemPrompt = `You are AXIO7, an AI assistant for the Columbia University and NYC student community. Answer the user's question using the live data provided. Be concise, specific, and link to /trade/[id] when referencing listings. Always reply in English. Under 200 words.`;

  const userMessage = `${query}${contextBlock}`;

  try {
    const answer = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      { model: process.env.OPENAI_MODEL || 'openai/gpt-4o-mini', temperature: 0.7, max_tokens: 350 }
    );

    return NextResponse.json({ answer, hasListings: contextParts.length > 0 });
  } catch (err) {
    console.error('[/api/ask]', err);
    return NextResponse.json({ error: 'Agent unavailable. Try again.' }, { status: 503 });
  }
}
