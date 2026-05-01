import { NextResponse } from 'next/server';
import { runAutonomousDiscussionScan, isDiscussionsEnabled } from '@/lib/agent-discussions';
import { getHourlyDiscussionCount } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — scanning multiple posts takes time

function checkSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const h = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  return h === secret;
}

export async function GET(req: Request) { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isDiscussionsEnabled()) {
    return NextResponse.json({ skipped: true, reason: 'discussions_disabled' });
  }

  const hourlyCount = await getHourlyDiscussionCount();
  const hourlyMax = Number(process.env.MAX_AGENT_DISCUSSION_REPLIES_PER_HOUR ?? '200');
  if (hourlyCount >= hourlyMax) {
    return NextResponse.json({ skipped: true, reason: 'hourly_cap_reached', hourlyCount });
  }

  // Read force flag from body (for admin manual trigger)
  let force = false;
  try {
    const body = await (req as any).json?.().catch(() => ({}));
    force = body?.force === true;
  } catch { /* ignore */ }

  const result = await runAutonomousDiscussionScan({ force });

  return NextResponse.json({
    ok: true,
    postsScanned: result.postsScanned,
    postsSelected: result.postsSelected,
    totalInserted: result.totalInserted,
    hourlyCount,
    details: result.details,
  });
}
