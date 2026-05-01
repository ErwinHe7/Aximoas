import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB

// ─── Provider definitions ─────────────────────────────────────────────────────

type Provider = 'removebg' | 'photoroom' | 'clipdrop';

interface ProviderResult {
  provider: Provider;
  pngBuffer: ArrayBuffer;
  qualityScore: number;        // 0–1, higher = better
  bgResidueRatio: number;      // fraction of image that looks like residual background
  warnings: string[];
}

// ─── Quality scoring (heuristic without native deps) ─────────────────────────
// Estimates quality from output PNG file size relative to input size.
// A well-cut portrait PNG with transparency should be significantly smaller
// than the original (background pixels become zero-cost transparent).
// A poor cut (background retained) keeps ~same size as original RGBA.

async function scoreCutout(
  pngBuffer: ArrayBuffer,
  originalFileSize: number,
): Promise<{
  score: number;
  bgResidueRatio: number;
  warnings: string[];
}> {
  const outSize = pngBuffer.byteLength;
  // Ratio of output to input: lower = more background removed (good)
  const sizeRatio = outSize / Math.max(originalFileSize, 1);

  const warnings: string[] = [];
  // If output is >90% of input, likely kept a lot of background
  if (sizeRatio > 0.9)  warnings.push('possible-background-residue');
  // If output is <5% of input, likely too aggressive (person deleted)
  if (sizeRatio < 0.05) warnings.push('subject-too-small');

  // Score: best around 0.2–0.6 ratio (good transparency, person intact)
  let score = 1.0;
  if (sizeRatio > 0.9)  score -= 0.35;
  if (sizeRatio > 0.95) score -= 0.25;
  if (sizeRatio < 0.05) score -= 0.5;

  const bgResidueRatio = Math.max(0, sizeRatio - 0.5);

  return { score: Math.max(0, score), bgResidueRatio, warnings };
}

// ─── Per-provider callers ─────────────────────────────────────────────────────

async function callRemoveBg(imageFile: File, apiKey: string): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append('image_file', imageFile);
  fd.append('size', 'auto');
  fd.append('type', 'person');
  fd.append('type_level', '2');   // fine hair/detail
  fd.append('format', 'png');
  fd.append('channels', 'rgba');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`remove.bg ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

async function callPhotoroom(imageFile: File, apiKey: string): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append('image_file', imageFile);

  const res = await fetch('https://image-api.photoroom.com/v2/segment', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Photoroom ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

async function callClipdrop(imageFile: File, apiKey: string): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append('image_file', imageFile);

  const res = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Clipdrop ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check — must be signed in to use this tool
  const user = await getCurrentUser().catch(() => null);
  if (!user?.authenticated) {
    return NextResponse.json(
      { error: 'Sign in required. Create a free account to use Portrait Background.' },
      { status: 401 }
    );
  }

  const removebgKey  = process.env.REMOVEBG_API_KEY;
  const photoroomKey = process.env.PHOTOROOM_API_KEY;
  const clipdropKey  = process.env.CLIPDROP_API_KEY;

  const configuredProviders: Provider[] = [];
  if (removebgKey)  configuredProviders.push('removebg');
  if (photoroomKey) configuredProviders.push('photoroom');
  if (clipdropKey)  configuredProviders.push('clipdrop');

  if (configuredProviders.length === 0) {
    return NextResponse.json(
      {
        error:
          'Background removal is not configured. ' +
          'Set at least one of: REMOVEBG_API_KEY, PHOTOROOM_API_KEY, CLIPDROP_API_KEY. ' +
          'Free tiers: remove.bg (50/mo), Clipdrop (100/mo), Photoroom (free tier available).',
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }); }

  const imageFile = formData.get('image') as File | null;
  if (!imageFile) return NextResponse.json({ error: 'Missing "image" field.' }, { status: 400 });
  if (imageFile.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: `Image too large (${(imageFile.size/1024/1024).toFixed(1)} MB). Max 12 MB.` }, { status: 400 });
  if (!imageFile.type.startsWith('image/'))
    return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });

  // Caller can request a specific provider or skip already-tried ones
  const bodyText = formData.get('options') as string | null;
  let options: { preferredProvider?: Provider; skipProviders?: Provider[]; qualityMode?: 'fast' | 'best' } = {};
  if (bodyText) { try { options = JSON.parse(bodyText); } catch { /* ignore */ } }

  const skipSet = new Set<Provider>(options.skipProviders ?? []);
  const qualityMode = options.qualityMode ?? 'best';

  // Build provider order: preferred first, then default order, skip already-tried
  const defaultOrder: Provider[] = ['removebg', 'photoroom', 'clipdrop'];
  let order: Provider[] = options.preferredProvider
    ? [options.preferredProvider, ...defaultOrder.filter(p => p !== options.preferredProvider)]
    : defaultOrder;
  order = order.filter(p => configuredProviders.includes(p) && !skipSet.has(p));

  if (order.length === 0) {
    return NextResponse.json(
      { error: 'All configured providers have been tried. Try uploading a clearer photo.' },
      { status: 422 }
    );
  }

  const QUALITY_THRESHOLD = 0.55; // minimum acceptable quality
  const results: ProviderResult[] = [];
  const errors: string[] = [];

  for (const provider of order) {
    let pngBuffer: ArrayBuffer;
    try {
      if (provider === 'removebg')  pngBuffer = await callRemoveBg(imageFile, removebgKey!);
      else if (provider === 'photoroom') pngBuffer = await callPhotoroom(imageFile, photoroomKey!);
      else pngBuffer = await callClipdrop(imageFile, clipdropKey!);
    } catch (err: any) {
      errors.push(`${provider}: ${err?.message ?? 'failed'}`);
      continue;
    }

    const quality = await scoreCutout(pngBuffer, imageFile.size);

    results.push({
      provider,
      pngBuffer,
      qualityScore: quality.score,
      bgResidueRatio: quality.bgResidueRatio,
      warnings: quality.warnings,
    });

    // In 'fast' mode: take first success
    // In 'best' mode: continue if quality is below threshold and more providers exist
    if (qualityMode === 'fast' || quality.score >= QUALITY_THRESHOLD) break;
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: `All providers failed: ${errors.join('; ')}` },
      { status: 502 }
    );
  }

  // Pick best quality result
  const best = results.sort((a, b) => b.qualityScore - a.qualityScore)[0];

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
    'Content-Length': String(best.pngBuffer.byteLength),
    'Cache-Control': 'no-store',
    'X-Provider': best.provider,
    'X-Quality-Score': best.qualityScore.toFixed(3),
    'X-BG-Residue-Ratio': best.bgResidueRatio.toFixed(3),
  };
  if (best.warnings.length > 0) {
    headers['X-Quality-Warnings'] = best.warnings.join(',');
  }
  if (configuredProviders.length > 1) {
    const remaining = order.filter(p => p !== best.provider);
    if (remaining.length > 0) headers['X-Available-Fallbacks'] = remaining.join(',');
  }

  return new NextResponse(best.pngBuffer, { status: 200, headers });
}
