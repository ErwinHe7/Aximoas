import type { NormalizedEvent } from '../types';
import { normalizeIcalEvent } from '../normalize';

const COLUMBIA_ICAL_URL =
  'https://events.columbia.edu/feeder/main/eventsFeed.do?f=y&sort=dtstart.utc:asc&skinName=ical';

// Minimal iCal parser — avoids a heavy dep, handles Columbia's specific format.
function parseIcal(text: string): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  let current: Record<string, unknown> | null = null;
  let lastKey = '';

  const lines = text
    .replace(/\r\n /g, '') // unfold
    .replace(/\r\n\t/g, '')
    .split(/\r\n|\n/);

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      lastKey = '';
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      lastKey = '';
    } else if (current) {
      const semi = line.indexOf(';');
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const sep = semi !== -1 && semi < colon ? semi : colon;
      const key = line.slice(0, sep).toLowerCase().replace(/;[^:]+/, '');
      const value = line.slice(colon + 1).trim();
      if (key) {
        current[key] = value;
        lastKey = key;
      } else if (lastKey) {
        // continuation line
        current[lastKey] = String(current[lastKey]) + line.trim();
      }
    }
  }
  return events;
}

export async function fetchColumbiaEvents(): Promise<NormalizedEvent[]> {
  const res = await fetch(COLUMBIA_ICAL_URL, {
    headers: { 'User-Agent': 'AXIO7-Events-Bot/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Columbia iCal fetch failed: ${res.status}`);
  const text = await res.text();
  const vevents = parseIcal(text);
  const normalized: NormalizedEvent[] = [];
  for (const v of vevents) {
    const n = normalizeIcalEvent(v);
    if (n) normalized.push(n);
  }
  return normalized;
}
