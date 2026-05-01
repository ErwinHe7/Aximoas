import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEED_POSTS = [
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
];

export async function POST(req: NextRequest) {
  // Auth check: only admin can call this
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;
  const authorName = body.author_name ?? user.name ?? 'Erwin He';
  const authorAvatar = user.avatar ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=ErwinHe`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://axio7.com').replace(/\/$/, '');

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      would_insert: SEED_POSTS.length,
      posts: SEED_POSTS.map((c) => c.slice(0, 80) + '…'),
    });
  }

  const results: { id: string; content_preview: string; fanout: string }[] = [];
  const errors: string[] = [];

  for (const content of SEED_POSTS) {
    const { data: post, error } = await supabaseAdmin()
      .from('posts')
      .insert({
        author_id: user.id,
        author_name: authorName,
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

    // Fire-and-forget fanout
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

    // Small pause between posts
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    inserted: results.length,
    errors: errors.length,
    results,
    error_details: errors,
  });
}
