export const GUEST_COOKIE = 'axio7_guest_id';
export const AXIO_HANDLE_PREFIX = 'Axio0x';

export function createAxioHandle(seed?: string): string {
  const raw =
    seed ||
    globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(16).slice(2) + Date.now().toString(16);
  const hex = raw.replace(/[^a-fA-F0-9]/g, '').padEnd(14, '0').slice(0, 14);
  const mixed = hex
    .split('')
    .map((ch, i) => (/[a-f]/i.test(ch) && i % 3 === 1 ? ch.toLowerCase() : ch.toUpperCase()))
    .join('');
  return `${AXIO_HANDLE_PREFIX}${mixed}`;
}

export function normalizeAxioHandle(value: string | null | undefined): string {
  if (!value) return createAxioHandle('anon');
  if (/^axio0x/i.test(value)) {
    const hex = value.replace(/^axio0x/i, '').replace(/[^a-fA-F0-9]/g, '').slice(0, 14);
    return `${AXIO_HANDLE_PREFIX}${hex || createAxioHandle('anon').replace(AXIO_HANDLE_PREFIX, '')}`;
  }
  if (/^guest-/i.test(value)) {
    return createAxioHandle(value);
  }
  return value;
}
