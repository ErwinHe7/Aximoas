import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 20 natural Columbia/NYC seed posts — used to fill up to target_count
const SEED_POOL = [
  "Just moved to Morningside Heights for my Columbia MSCS. Rent is wild — any tips on finding a no-broker-fee sublet for the summer? I'm looking for June–August, ideally within 10 min walk of campus.",
  "What's the most underrated thing to do in NYC as a student that most people don't find until their last semester? Not tourist stuff — things locals actually do.",
  "Hot take: Columbia's grad student stipends haven't kept up with NYC rent inflation at all. In 2019 you could live within walking distance on a PhD stipend. Now it's basically impossible. Is this just Columbia or every NYC school?",
  "Selling my 2023 MacBook Pro M3 14\" — 18GB RAM, 512GB SSD, AppleCare+ until Sept 2026. Bought it for grad school, upgrading to M4. No scratches, charger included. $1,400 OBO. Pickup Upper West Side.",
  "I got two competing offers — one from a fintech startup (Series B, $140k + equity) and one from Google (L4, $185k total comp, mostly RSU). The startup role is more senior and interesting. How should I actually think through this decision?",
  "Any Columbia students going to NYC Tech Week events next month? Looking for people to go with — especially the AI/founder stuff. Also if anyone has extra tickets to any sessions, DM me.",
  "What's actually the best late-night food within 20 min of 116th & Broadway? I'm talking post-midnight, walking distance or cheap Uber. Please be specific — not just 'get pizza'.",
  "I'm working on a project that uses LLMs to help international students navigate visa/work authorization paperwork (OPT, CPT, H1B timelines). Is this useful to people here? Would you use it?",
  "Looking for 1–2 roommates for a 3BR in Washington Heights, June 1st. $1,150/person all-in (utilities + wifi included). 5 min walk from the A train, laundry in building.",
  "Finished my thesis defense today after 3 years. Still processing. The weirdest part isn't relief — it's not knowing what to do with all the mental space that used to be occupied by the problem. Anyone else felt this post-PhD void?",
  "Best coffee shops near Columbia to actually get work done? I need strong wifi, not too loud, and ideally open past 10pm. Bonus if it's not Starbucks.",
  "Anyone selling dining swipes this week? Willing to pay $8–10 per swipe. Can meet anywhere near campus. DM me.",
  "NYC apartment hunting tip I wish someone told me: always check the boiler room in the basement before signing. Old buildings in Harlem + Washington Heights have notoriously unreliable heat in winter.",
  "Does anyone know a good immigration lawyer in NYC who works with international students? Specifically F-1 to H-1B transition. Looking for someone who won't charge $500/hour.",
  "Genuine question: is it worth doing an MBA right after undergrad, or should I work for 2–3 years first? I have a Columbia offer and a decent job at a consulting firm. The opportunity cost is massive.",
  "Anyone want to split a Costco membership? I'm on the UWS, happy to share the card if we do monthly runs together. Saves like $30/year each.",
  "Giving away a barely-used IKEA desk (MICKE, white, 105cm) and office chair. Moving out June 15th. You pick up from 110th Street, I'll help carry it down. Free, first come first served.",
  "Just got back from a week in Tokyo and honestly thinking about whether NYC is worth the cost anymore. $2,800/month for a shoebox studio vs. amazing food/transit for 1/3 the price. What keeps you here?",
  "Anyone else feel like the Columbia career center is completely useless for non-finance/consulting paths? Every event is Goldman or McKinsey. I'm in CS and trying to get into climate tech — completely on my own.",
  "Looking for a sublet on the Upper West Side or Morningside Heights for August. Budget $1,800–$2,200/month. Furnished preferred. I'm a PhD student, quiet, clean, no pets.",
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;
  const targetCount: number = typeof body.target_count === 'number' ? body.target_count : 29;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://axio7.com').replace(/\/$/, '');
  const authorAvatar = user.avatar ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.name ?? 'ErwinHe')}`;

  // Count existing posts
  const { count: currentCount, error: countErr } = await supabaseAdmin()
    .from('posts')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    return NextResponse.json({ error: 'Failed to count posts', detail: countErr.message }, { status: 500 });
  }

  const current = currentCount ?? 0;
  const needed = Math.max(0, targetCount - current);

  if (dryRun || needed === 0) {
    return NextResponse.json({
      dry_run: dryRun,
      current_count: current,
      target_count: targetCount,
      needed,
      inserted: 0,
      would_insert: needed,
      sample: SEED_POOL.slice(0, needed).map((c) => c.slice(0, 80) + '…'),
    });
  }

  // Fetch existing post content to avoid duplicates
  const { data: existingPosts } = await supabaseAdmin()
    .from('posts')
    .select('content')
    .order('created_at', { ascending: false })
    .limit(100);

  const existingContent = new Set((existingPosts ?? []).map((p: { content: string }) => p.content.trim()));

  // Pick seed posts not already in DB
  const candidates = SEED_POOL.filter((c) => !existingContent.has(c.trim()));
  const toInsert = candidates.slice(0, needed);

  if (toInsert.length === 0) {
    return NextResponse.json({
      current_count: current,
      target_count: targetCount,
      needed,
      inserted: 0,
      note: 'All seed posts already exist in DB — no duplicates inserted',
    });
  }

  const results: { id: string; content_preview: string; fanout: string }[] = [];
  const errors: string[] = [];

  for (const content of toInsert) {
    const { data: post, error } = await supabaseAdmin()
      .from('posts')
      .insert({
        author_id: user.id,
        author_name: user.name ?? 'Erwin He',
        author_avatar: authorAvatar,
        content,
        images: [],
      })
      .select('id')
      .single();

    if (error || !post) {
      errors.push(error?.message ?? 'insert failed');
      continue;
    }

    // Fire-and-forget fanout — failure must not block post insertion
    let fanoutStatus = 'skipped';
    try {
      const fr = await fetch(`${siteUrl}/api/fanout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      });
      fanoutStatus = fr.ok ? 'triggered' : `http_${fr.status}`;
    } catch {
      fanoutStatus = 'fetch_error';
    }

    results.push({ id: post.id, content_preview: content.slice(0, 60), fanout: fanoutStatus });
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    current_count: current,
    target_count: targetCount,
    needed,
    inserted: results.length,
    errors: errors.length,
    results,
    error_details: errors,
  });
}
