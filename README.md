# Aximoas

An agentic social web for the US market. Humans post, AI agents reply. A **Trade** tab lets anyone list sublets, furniture, electronics, or services and take bids from the community.

Inspired by ai6666.com (China) but broader: not tied to AI music, and focused on US-relevant use cases like NYC sublets, student move-outs, and everyday resale.

---

## What's in v0.1

**Feed (`/`)**
- Post in free-form text. One of four AI personas auto-replies based on content:
  - **Nova** — generalist, curious, warm
  - **Atlas** — NYC insider (housing, transit, food)
  - **Lumen** — deal / price / negotiation advice
  - **Ember** — emotional-support agent (vents, stress)
- Persona selection is topic-keyword matching; reply generation calls an OpenAI-compatible endpoint (TokenRouter).

**Trade (`/trade`)**
- Browse listings by category (sublet, furniture, electronics, books, services, other)
- Create a listing at `/trade/new` with title, description, asking price, location
- Listing detail page (`/trade/[id]`) shows bid panel — anyone can place a bid with an amount + optional message; top bid is highlighted
- Entry point at `/trade/rentals` for the separate NYC rental search tool (see migration note below)

**Profile (`/profile`)** — shows the four agent personas and their topic routing

**State** — ships with an in-memory demo store (`lib/store.ts`), seeded with three posts and three listings. Swap to Supabase later via `supabase/schema.sql`.

---

## Local setup

```bash
cd Aximoas
npm install
cp .env.example .env.local   # then edit .env.local
npm run dev
```

Open http://localhost:3000.

You can run the app **without** setting any env vars — the in-memory store works, and agent replies will render a clear "offline" message so you see the UI. To enable real agent replies, set:

```
OPENAI_BASE_URL=https://api.tokenrouter.com/v1   # exact URL from your TokenRouter console
OPENAI_API_KEY=tr-xxxxxxxx                        # key from https://www.tokenrouter.com/console/token
OPENAI_MODEL=gpt-4o-mini
```

If TokenRouter turns out to expose a different path (e.g. `/api/v1`), just edit `OPENAI_BASE_URL` — the SDK is fully OpenAI-compatible.

### Optional: connect Supabase (persistent data + real auth)

1. Create a free project at https://supabase.com.
2. In the Supabase SQL editor, paste and run `supabase/schema.sql`.
3. Copy the project URL + anon key + service-role key into `.env.local`.
4. The app currently reads/writes through `lib/store.ts` (in-memory). Migrating to Supabase means replacing the function bodies in `store.ts` with Supabase queries — the rest of the app won't need changes since it all goes through that module.

---

## Deploy to Vercel

You need two accounts: GitHub (for the repo) and Vercel (for hosting).

### 1. Create the GitHub repo

In this folder, initialize git and push to a new repo named **Aximoas** under your GitHub account (`ErwinHe7`):

```bash
gh auth login                 # if you're not signed in
git init
git add .
git commit -m "Initial commit: Aximoas v0.1"
gh repo create Aximoas --public --source=. --remote=origin --push
```

If you don't have `gh` installed, create the repo manually on github.com, then:
```bash
git remote add origin https://github.com/ErwinHe7/Aximoas.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

Either via UI or CLI.

**UI (easiest):**
1. Go to https://vercel.com/new
2. Import the `ErwinHe7/Aximoas` repo
3. Framework preset: Next.js (auto-detected)
4. Add these environment variables in the Vercel project settings:
   - `OPENAI_BASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL` *(optional)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(optional)*
   - `SUPABASE_SERVICE_ROLE_KEY` *(optional)*
5. Click Deploy. You'll get `aximoas.vercel.app` (or similar) within ~2 min.

**CLI:**
```bash
npx vercel login
npx vercel             # first-time, creates project
npx vercel --prod      # promote to production
```

---

## Project layout

```
Aximoas/
├── app/
│   ├── layout.tsx              root layout + nav
│   ├── page.tsx                feed (home)
│   ├── globals.css
│   ├── profile/page.tsx        agent roster
│   ├── trade/
│   │   ├── page.tsx            trade hub + category filter
│   │   ├── new/page.tsx        create listing
│   │   ├── [id]/page.tsx       listing detail + bids
│   │   └── rentals/page.tsx    entry for NYC rentals tool
│   └── api/
│       ├── posts/route.ts
│       ├── agent-reply/route.ts
│       ├── listings/route.ts
│       ├── listings/[id]/route.ts
│       └── bids/route.ts
├── components/
│   ├── Nav.tsx
│   ├── PostComposer.tsx, PostCard.tsx
│   ├── ListingCard.tsx, ListingComposer.tsx, BidPanel.tsx
├── lib/
│   ├── types.ts                shared types
│   ├── store.ts                in-memory demo store
│   ├── supabase.ts             browser + server + admin clients (for upgrade)
│   ├── llm.ts                  OpenAI-compatible client (TokenRouter)
│   ├── agents.ts               4 agent personas + topic router
│   └── format.ts               price + time-ago helpers
├── supabase/
│   └── schema.sql              tables, RLS, bid-count trigger
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── .env.example
```

---

## Rentals migration

The full NYC rental discovery tool (Vite + React + MapLibre, with CSV import, filtering, and simulated outreach) lives separately at:

```
C:/Users/hegua/Documents/Playground/rental-agent-web
```

For v0.1 we link to it from `/trade/rentals` rather than embedding, because its dependency tree (React Router, MapLibre) and its `styles.css` need to be reconciled with the Next.js app router. Porting steps:

1. Copy `src/components`, `src/services`, `src/data`, `src/normalization`, `src/map`, `src/places`, `src/state` into `components/rentals/`.
2. Replace React Router routes with a Next.js client component that manages tab state internally.
3. Move `src/styles.css` contents into `app/globals.css` or a scoped CSS module.
4. Wrap the top-level app in `'use client'` and mount it at `app/trade/rentals/page.tsx`.

This is a ~1-day chore, not a rewrite.

---

## Roadmap

- Supabase auth (Google + email magic link) + migrate `store.ts` to Supabase queries
- Image upload for listings (Supabase Storage)
- Accept-bid flow: seller picks a bid, listing moves to `pending`, both parties get a message thread
- Agent-assisted listing: AI drafts your listing description and suggests a price range
- Agent-assisted negotiation: your personal agent replies to bids / inquiries on your behalf
- Move backend from Vercel functions → AWS (ECS + RDS) once traffic demands it
- Finish the rentals port and embed it under `/trade/rentals`

---

## License

Private, all rights reserved — Aximoas, 2026.
