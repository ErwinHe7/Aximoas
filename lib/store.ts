import { randomUUID } from 'crypto';
import type { Bid, Listing, Post, Reply } from './types';

// In-memory demo store. Works without Supabase for instant local dev.
// Swap to Supabase by wiring through lib/supabase.ts once env vars are set.

type DB = {
  posts: Post[];
  replies: Reply[];
  listings: Listing[];
  bids: Bid[];
};

const g = globalThis as unknown as { __aximoas_db?: DB };

function seed(): DB {
  const now = () => new Date().toISOString();
  const demoUser = {
    id: 'demo-user-1',
    name: 'Demo Human',
    avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Demo',
  };

  const posts: Post[] = [
    {
      id: randomUUID(),
      author_id: demoUser.id,
      author_name: demoUser.name,
      author_avatar: demoUser.avatar,
      content:
        "Just moved to Morningside Heights for a Columbia PhD. Rent in the neighborhood is brutal — any tips on actually-affordable sublets that don't require a broker fee?",
      created_at: new Date(Date.now() - 3600_000 * 4).toISOString(),
      reply_count: 0,
      like_count: 12,
    },
    {
      id: randomUUID(),
      author_id: 'demo-user-2',
      author_name: 'Mei',
      author_avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Mei',
      content:
        "Selling my IKEA Malm desk + chair combo — graduating and moving home. What's a fair price for barely-used stuff when the thrift market is saturated with student move-outs in May?",
      created_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
      reply_count: 0,
      like_count: 3,
    },
    {
      id: randomUUID(),
      author_id: 'demo-user-3',
      author_name: 'Jordan',
      author_avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Jordan',
      content:
        "Feeling wrecked from thesis defense. Didn't sleep. Just need to vent for a second.",
      created_at: new Date(Date.now() - 60_000 * 40).toISOString(),
      reply_count: 0,
      like_count: 8,
    },
  ];

  const listings: Listing[] = [
    {
      id: randomUUID(),
      seller_id: 'demo-user-2',
      seller_name: 'Mei',
      category: 'furniture',
      title: 'IKEA Malm desk + chair (barely used)',
      description: 'Selling my desk + chair as I move out. Pickup in Morningside Heights. Perfect for a dorm or small apartment.',
      asking_price_cents: 12000,
      currency: 'USD',
      location: 'Morningside Heights, NYC',
      images: [],
      status: 'open',
      created_at: new Date(Date.now() - 3600_000 * 6).toISOString(),
      bid_count: 2,
      top_bid_cents: 9000,
    },
    {
      id: randomUUID(),
      seller_id: 'demo-user-4',
      seller_name: 'Sam',
      category: 'sublet',
      title: 'Summer sublet: 1BR Upper West Side, May–Aug',
      description: 'Leaving for a summer internship. Quiet block, 5 min walk to 1 train. Partially furnished.',
      asking_price_cents: 280000,
      currency: 'USD',
      location: 'Upper West Side, NYC',
      images: [],
      status: 'open',
      created_at: new Date(Date.now() - 3600_000 * 12).toISOString(),
      bid_count: 0,
      top_bid_cents: null,
    },
    {
      id: randomUUID(),
      seller_id: 'demo-user-5',
      seller_name: 'Priya',
      category: 'electronics',
      title: 'iPad Pro 11" (2023) + Apple Pencil',
      description: 'Minor screen wear from use in school. Charger + case included.',
      asking_price_cents: 60000,
      currency: 'USD',
      location: 'Midtown, NYC',
      images: [],
      status: 'open',
      created_at: new Date(Date.now() - 3600_000 * 22).toISOString(),
      bid_count: 1,
      top_bid_cents: 55000,
    },
  ];

  return { posts, replies: [], listings, bids: [] };
}

function db(): DB {
  if (!g.__aximoas_db) g.__aximoas_db = seed();
  return g.__aximoas_db;
}

// Posts
export function listPosts(): Post[] {
  return [...db().posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function getPost(id: string): Post | null {
  return db().posts.find((p) => p.id === id) ?? null;
}
export function createPost(input: { author_name: string; content: string }): Post {
  const p: Post = {
    id: randomUUID(),
    author_id: 'demo-user-' + Math.random().toString(36).slice(2, 8),
    author_name: input.author_name || 'Anonymous',
    author_avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(input.author_name || 'anon')}`,
    content: input.content,
    created_at: new Date().toISOString(),
    reply_count: 0,
    like_count: 0,
  };
  db().posts.push(p);
  return p;
}
export function incrementLike(id: string): Post | null {
  const p = getPost(id);
  if (p) p.like_count += 1;
  return p;
}

// Replies
export function listReplies(postId: string): Reply[] {
  return db()
    .replies.filter((r) => r.post_id === postId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export function createReply(input: {
  post_id: string;
  author_kind: 'human' | 'agent';
  author_name: string;
  author_avatar?: string | null;
  agent_persona?: string | null;
  content: string;
}): Reply {
  const r: Reply = {
    id: randomUUID(),
    post_id: input.post_id,
    author_kind: input.author_kind,
    author_id: input.author_kind === 'agent' ? `agent-${input.agent_persona}` : 'demo-user',
    author_name: input.author_name,
    author_avatar: input.author_avatar ?? null,
    agent_persona: input.agent_persona ?? null,
    content: input.content,
    created_at: new Date().toISOString(),
  };
  db().replies.push(r);
  const post = getPost(input.post_id);
  if (post) post.reply_count += 1;
  return r;
}

// Listings
export function listListings(filter?: { category?: string }): Listing[] {
  let items = [...db().listings];
  if (filter?.category) items = items.filter((l) => l.category === filter.category);
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function getListing(id: string): Listing | null {
  return db().listings.find((l) => l.id === id) ?? null;
}
export function createListing(input: Omit<Listing, 'id' | 'created_at' | 'bid_count' | 'top_bid_cents' | 'status'>): Listing {
  const l: Listing = {
    ...input,
    id: randomUUID(),
    status: 'open',
    created_at: new Date().toISOString(),
    bid_count: 0,
    top_bid_cents: null,
  };
  db().listings.push(l);
  return l;
}

// Bids
export function listBids(listingId: string): Bid[] {
  return db()
    .bids.filter((b) => b.listing_id === listingId)
    .sort((a, b) => b.amount_cents - a.amount_cents);
}
export function createBid(input: {
  listing_id: string;
  bidder_name: string;
  amount_cents: number;
  message?: string | null;
}): Bid | null {
  const listing = getListing(input.listing_id);
  if (!listing || listing.status !== 'open') return null;
  const b: Bid = {
    id: randomUUID(),
    listing_id: input.listing_id,
    bidder_id: 'demo-bidder-' + Math.random().toString(36).slice(2, 8),
    bidder_name: input.bidder_name,
    amount_cents: input.amount_cents,
    message: input.message ?? null,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  db().bids.push(b);
  listing.bid_count += 1;
  if (listing.top_bid_cents === null || input.amount_cents > listing.top_bid_cents) {
    listing.top_bid_cents = input.amount_cents;
  }
  return b;
}
