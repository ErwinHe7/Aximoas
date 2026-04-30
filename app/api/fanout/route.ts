import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fanOutAgentReplies } from '@/lib/agent-fanout';
import { getCurrentUser } from '@/lib/auth';
import { trackServerEvent } from '@/lib/observability/posthog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Input = z.object({
  post_id: z.string().uuid(),
  mention: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid input' }, { status: 400 });

  const [user, result] = await Promise.all([
    getCurrentUser().catch(() => null),
    fanOutAgentReplies(parsed.data.post_id, parsed.data.mention).catch((err) => {
      console.error('[fanout]', err);
      return { succeeded: 0, failed: 7, totalLatencyMs: 0, totalCostUsd: 0 };
    }),
  ]);

  try {
    trackServerEvent(user?.id ?? 'anonymous', {
      event: 'agents_responded',
      properties: {
        post_id: parsed.data.post_id,
        user_id: user?.id ?? 'anonymous',
        agents_succeeded: result.succeeded,
        agents_failed: result.failed,
        total_latency_ms: result.totalLatencyMs,
        total_cost_usd: result.totalCostUsd,
      },
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json(result);
}
