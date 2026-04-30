import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chat } from '@/lib/llm';
import { listListings, listPosts } from '@/lib/store';
import { detectEventIntent, searchEvents } from '@/lib/events/search';
import type { Event } from '@/lib/events/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  query: z.string().min(1).max(500),
});

const HOUSING_KW   = ['sublet', 'rent', 'room', 'apartment', 'sublease', 'housing', 'roommate', '转租', '找房'];
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
  const contextParts: string[] = [];
  let eventResults: Event[] = [];

  try {
    const isHousing   = matchesAny(query, HOUSING_KW);
    const isFurniture = matchesAny(query, FURNITURE_KW);
    const isEvent     = detectEventIntent(query);

    const [listings, posts, events] = await Promise.all([
      listListings({ category: isHousing ? 'sublet' : isFurniture ? 'furniture' : undefined }),
      listPosts(20),
      isEvent ? searchEvents(query, { limit: 5 }).catch(() => []) : Promise.resolve([]),
    ]);

    // Events context
    if (events.length > 0) {
      eventResults = events;
      const lines = events.map((ev, i) => {
        const when = ev.start_time
          ? new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          : 'Date TBD';
        const price = ev.price_text ? ` · ${ev.price_text}` : ev.is_free ? ' · Free' : '';
        return `${i + 1}. "${ev.title}" — ${when} — ${ev.location ?? 'NYC'}${price} (/events/${ev.id})`;
      });
      contextParts.push(`Upcoming events on AXIO7:\n${lines.join('\n')}`);
    }

    // Listings context
    const openListings = listings.filter((l) => l.status === 'open').slice(0, 5);
    if (openListings.length > 0) {
      const lines = openListings.map((l) => {
        const price = l.asking_price_cents > 0 ? `$${(l.asking_price_cents / 100).toFixed(0)}` : 'price TBD';
        const loc = l.location ? ` · ${l.location}` : '';
        return `• "${l.title}" — ${price}${loc} (/trade/${l.id})`;
      });
      contextParts.push(`Current listings on AXIO7 Trade:\n${lines.join('\n')}`);
    }

    // Community posts context
    const relevantPosts = posts
      .filter((p) => {
        const lc = p.content.toLowerCase();
        return (
          (isHousing && HOUSING_KW.some((k) => lc.includes(k))) ||
          (isEvent && detectEventIntent(p.content)) ||
          (isFurniture && FURNITURE_KW.some((k) => lc.includes(k)))
        );
      })
      .slice(0, 3);

    if (relevantPosts.length > 0) {
      const lines = relevantPosts.map(
        (p) => `• "${p.content.slice(0, 100)}" — posted by ${p.author_name}`
      );
      contextParts.push(`Recent community posts:\n${lines.join('\n')}`);
    }
  } catch {
    // proceed without context if store fails
  }

  const contextBlock = contextParts.length > 0
    ? `\n\n[AXIO7 Live Data]\n${contextParts.join('\n\n')}`
    : '';

  const systemPrompt = `You are AXIO7, an AI assistant for the Columbia University and NYC student community. Answer the user's question using the live data provided. Be concise and specific. When referencing events cite them by number. When referencing listings or events use their /events/ or /trade/ links. Always reply in English. Under 180 words.`;

  try {
    const answer = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${query}${contextBlock}` },
      ],
      { model: process.env.OPENAI_MODEL || 'openai/gpt-4o-mini', temperature: 0.7, max_tokens: 350 }
    );

    return NextResponse.json({
      answer,
      events: eventResults.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start_time: ev.start_time,
        location: ev.location,
        poster_url: ev.poster_url,
        is_free: ev.is_free,
        price_text: ev.price_text,
        category: ev.category,
        tags: ev.tags,
        description: ev.description,
        borough: ev.borough,
        url: ev.url,
        end_time: ev.end_time,
        lat: ev.lat,
        lng: ev.lng,
        source_id: ev.source_id,
        external_id: ev.external_id,
        submitted_by_author_id: ev.submitted_by_author_id,
        status: ev.status,
        freshness_score: ev.freshness_score,
        created_at: ev.created_at,
        updated_at: ev.updated_at,
      })),
    });
  } catch (err) {
    console.error('[/api/ask]', err);
    return NextResponse.json({ error: 'Agent unavailable. Try again.' }, { status: 503 });
  }
}
