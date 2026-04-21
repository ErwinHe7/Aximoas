import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    has_openai_key: Boolean(process.env.OPENAI_API_KEY),
    has_openai_base_url: Boolean(process.env.OPENAI_BASE_URL),
    openai_model: process.env.OPENAI_MODEL ?? '(not set)',
    supabase_url_prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) ?? '(not set)',
  });
}
