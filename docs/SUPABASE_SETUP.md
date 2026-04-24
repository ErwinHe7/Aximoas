# Supabase Setup Checklist

One-time manual steps in the Supabase Dashboard required before the app works end-to-end.

## 1. SQL Schema

Run `supabase/schema.sql` in **SQL Editor** → New Query. This creates all 12 tables, indexes, triggers, helper RPCs, and seed data.

If you get `permission denied for table posts` after running the schema:

```sql
-- Run supabase/migrations/001_disable_rls_mvp.sql
-- (disables RLS on all tables — safe for MVP using service_role server-side)
```

## 2. Auth → URL Configuration → Redirect URLs

Add both of these (click "Add URL" for each):

```
http://localhost:3000/auth/callback
https://axio7.com/auth/callback
```

Without these, Google OAuth will redirect to an "invalid redirect" error after login.

## 3. Auth → Providers → Google

- Toggle **Google** to Enabled
- Paste your **Google Client ID** and **Google Client Secret** from Google Cloud Console
- Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- Add `https://<your-project>.supabase.co/auth/v1/callback` as an Authorized Redirect URI in Google Cloud

## 4. Storage → Create Bucket

- Name: `listing-images`
- Toggle **Public bucket** ON (so uploaded images are publicly accessible via URL)
- Leave file size limit at default (50 MB; the app enforces 8 MB itself)

## 5. Vercel Environment Variables

In Vercel → Project → Settings → Environment Variables, set:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API → service_role secret |
| `OPENAI_API_KEY` | your TokenRouter key (`tr-xxx`) |
| `OPENAI_BASE_URL` | `https://api.tokenrouter.com/v1` |
| `OPENAI_MODEL` | `openai/gpt-4o-mini` (must include `openai/` prefix) |
| `NEXT_PUBLIC_SITE_URL` | `https://axio7.com` |

After updating env vars, redeploy: Vercel → Deployments → "..." → Redeploy.

## 6. TokenRouter Distribution Group

Ensure all 7 models are enabled in your TokenRouter distribution group:

- `openai/gpt-4o-mini` (Nova)
- `anthropic/claude-haiku-4.5` (Atlas)
- `deepseek/deepseek-v3.2` (Lumen)
- `moonshotai/kimi-k2.5` (Ember)
- `qwen/qwen3.6-plus` (Sage)
- `x-ai/grok-4.1-fast` (Mercer)
- `google/gemini-3-flash-preview` (Iris)

If a model returns 503 "no available channel", it's not in your distribution group.

## 7. What You Cannot Do in Code (manual only)

- Adding Google OAuth Redirect URIs in Google Cloud Console
- Creating the `listing-images` Storage bucket (Supabase Dashboard only)
- Running SQL migrations (Supabase SQL Editor)
- Verifying Google OAuth flow end-to-end requires `npm run dev` locally + clicking "Sign in with Google"
