-- Aximoas — Supabase schema (run in the Supabase SQL editor once your project is created).
-- In-memory store (lib/store.ts) ships as the default so the app runs without this step.
-- Swap in a Supabase-backed store when ready.

create extension if not exists "pgcrypto";

-- Profiles: mirrors auth.users with public-facing name/avatar.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  like_count int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create type reply_author_kind as enum ('human', 'agent');

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_kind reply_author_kind not null,
  author_id uuid references public.profiles(id) on delete set null,
  agent_persona text,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists replies_post_idx on public.replies (post_id, created_at);

create type listing_category as enum ('sublet', 'furniture', 'electronics', 'books', 'services', 'other');
create type listing_status as enum ('open', 'pending', 'sold', 'withdrawn');

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category listing_category not null,
  title text not null check (char_length(title) between 1 and 140),
  description text not null,
  asking_price_cents int not null check (asking_price_cents >= 0),
  currency text not null default 'USD',
  location text,
  images jsonb not null default '[]'::jsonb,
  status listing_status not null default 'open',
  bid_count int not null default 0,
  top_bid_cents int,
  created_at timestamptz not null default now()
);
create index if not exists listings_category_idx on public.listings (category, created_at desc);

create type bid_status as enum ('active', 'accepted', 'rejected', 'withdrawn');

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  message text,
  status bid_status not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists bids_listing_idx on public.bids (listing_id, amount_cents desc);

-- Keep listing.bid_count / top_bid_cents in sync.
create or replace function public.update_listing_bid_stats() returns trigger as $$
begin
  update public.listings l
  set
    bid_count = (select count(*) from public.bids b where b.listing_id = l.id and b.status = 'active'),
    top_bid_cents = (select max(amount_cents) from public.bids b where b.listing_id = l.id and b.status = 'active')
  where l.id = coalesce(new.listing_id, old.listing_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists bids_stats_trigger on public.bids;
create trigger bids_stats_trigger
after insert or update or delete on public.bids
for each row execute function public.update_listing_bid_stats();

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.listings enable row level security;
alter table public.bids enable row level security;

-- Profiles: anyone can read; user manages their own row.
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Posts: anyone can read; author writes their own.
create policy "posts read" on public.posts for select using (true);
create policy "posts author insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts author update" on public.posts for update using (auth.uid() = author_id);
create policy "posts author delete" on public.posts for delete using (auth.uid() = author_id);

-- Replies: anyone reads. Humans write their own. Agent replies are inserted via service role only.
create policy "replies read" on public.replies for select using (true);
create policy "replies human insert" on public.replies for insert
  with check (author_kind = 'human' and auth.uid() = author_id);

-- Listings: anyone reads; seller manages own.
create policy "listings read" on public.listings for select using (true);
create policy "listings seller insert" on public.listings for insert with check (auth.uid() = seller_id);
create policy "listings seller update" on public.listings for update using (auth.uid() = seller_id);
create policy "listings seller delete" on public.listings for delete using (auth.uid() = seller_id);

-- Bids: anyone reads; bidder manages own.
create policy "bids read" on public.bids for select using (true);
create policy "bids bidder insert" on public.bids for insert with check (auth.uid() = bidder_id);
create policy "bids bidder update" on public.bids for update using (auth.uid() = bidder_id);
