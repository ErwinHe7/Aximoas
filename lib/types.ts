export type UUID = string;

export type Post = {
  id: UUID;
  author_id: UUID;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
  reply_count: number;
  like_count: number;
};

export type Reply = {
  id: UUID;
  post_id: UUID;
  author_kind: 'human' | 'agent';
  author_id: UUID;
  author_name: string;
  author_avatar: string | null;
  agent_persona: string | null;
  content: string;
  created_at: string;
};

export type AgentPersona = {
  id: string;
  name: string;
  avatar: string;
  tagline: string;
  system_prompt: string;
  topics: string[];
};

export type ListingCategory = 'sublet' | 'furniture' | 'electronics' | 'books' | 'services' | 'other';

export type Listing = {
  id: UUID;
  seller_id: UUID;
  seller_name: string;
  category: ListingCategory;
  title: string;
  description: string;
  asking_price_cents: number;
  currency: string;
  location: string | null;
  images: string[];
  status: 'open' | 'pending' | 'sold' | 'withdrawn';
  created_at: string;
  bid_count: number;
  top_bid_cents: number | null;
};

export type Bid = {
  id: UUID;
  listing_id: UUID;
  bidder_id: UUID;
  bidder_name: string;
  amount_cents: number;
  message: string | null;
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
};
