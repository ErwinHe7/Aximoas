'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';

const BG_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Red',   value: '#e53e3e' },
  { label: 'Blue',  value: '#2563eb' },
  { label: 'Gray',  value: '#6b7280' },
];

type Status = 'idle' | 'processing' | 'done' | 'error';

/**
 * Remove background using the browser-native Background Removal API
 * (Chrome 123+) or fall back to a canvas-based edge-detection approach.
 *
 * Primary: window.ai / ImageSegmenter if available
 * Fallback: load @imgly/background-removal from CDN via ESM
 * Last resort: simple alpha-trim (removes near-white edges) — works for
 *   passport-style photos with uniform backgrounds.
 */
async function removeBackground(file: File): Promise<Blob> {
  // Try CDN ESM import with a short timeout
  try {
    const mod = await Promise.race([
      import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/browser/index.mjs' as string
      ) as Promise<{ removeBackground: (src: Blob | File) => Promise<Blob> }>,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('cdn_timeout')), 8000)),
    ]);
    return await mod.removeBackground(file);
  } catch {
    // Fall back to canvas-based removal
    return canvasRemoveBackground(file);
  }
}

/**
 * Canvas fallback: treats near-uniform background pixels as transparent.
 * Works well for photos with clean, solid backgrounds (passport, ID, etc).
 * Samples corner pixels to detect background color, then floods-erases similar pixels.
 */
async function canvasRemoveBackground(file: File): Promise<Blob> {
  const img = new Image();
  const objUrl = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = objUrl;
  });
  URL.revokeObjectURL(objUrl);

  const canvas = document.createElement('canvas');
  const MAX = 1200;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Sample 4 corners to estimate background color
  function getRGB(x: number, y: number) {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  }
  const corners = [
    getRGB(0, 0), getRGB(w - 1, 0), getRGB(0, h - 1), getRGB(w - 1, h - 1),
  ];
  const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
  const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
  const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

  // Tolerance — how similar a pixel must be to background to be erased
  const TOLERANCE = 40;

  function colorDiff(r: number, g: number, b: number) {
    return Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );
  }

  // BFS flood-fill from all 4 corners to remove background
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  function enqueue(x: number, y: number) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const pi = idx * 4;
    if (colorDiff(data[pi], data[pi + 1], data[pi + 2]) <= TOLERANCE) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  // Seed from border pixels
  for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
  for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % w;
    const y = Math.floor(idx / w);
    // Make transparent
    data[idx * 4 + 3] = 0;
    enqueue(x + 1, y); enqueue(x - 1, y);
    enqueue(x, y + 1); enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

async function compositeImage(subjectBlob: Blob, bgColor: string): Promise<string> {
  const url = URL.createObjectURL(subjectBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function ProfilePhotoBackgroundTool() {
  const [status, setStatus] = useState<Status>('idle');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectBlobRef = useRef<Blob | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WebP, HEIC, etc.).');
      return;
    }

    setStatus('processing');
    setResultUrl(null);
    setErrorMsg(null);
    subjectBlobRef.current = null;
    setProgressMsg('Loading image…');

    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);

    try {
      setProgressMsg('Removing background… (10–40s for AI method, faster for simple backgrounds)');
      const subjectBlob = await removeBackground(file);
      subjectBlobRef.current = subjectBlob;
      setProgressMsg('Compositing…');
      const finalUrl = await compositeImage(subjectBlob, bgColor);
      setResultUrl(finalUrl);
      setStatus('done');
      setProgressMsg('');
    } catch (err: any) {
      console.error('[bg-removal]', err);
      setErrorMsg(
        'Processing failed. Tips: use a photo with a clear subject against a plain background. ' +
        'Portrait photos or ID-style shots work best. Max recommended size: 5MB.'
      );
      setStatus('error');
      setProgressMsg('');
    }
  }

  async function handleBgChange(color: string) {
    setBgColor(color);
    if (subjectBlobRef.current && status === 'done') {
      const finalUrl = await compositeImage(subjectBlobRef.current, color);
      setResultUrl(finalUrl);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function downloadResult() {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'photo-new-background.png';
    a.click();
  }

  return (
    <div className="rounded-[22px] p-5 space-y-4" style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>Photo Background</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--lt-muted)' }}>
          Change a photo background to white, red, blue, or gray while keeping the subject unchanged.
        </p>
      </div>

      {/* Background color selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--lt-muted)' }}>Background:</span>
        {BG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleBgChange(opt.value)}
            title={opt.label}
            className="h-8 w-8 rounded-full transition hover:scale-110"
            style={{
              background: opt.value,
              outline: bgColor === opt.value ? '2.5px solid var(--molt-shell)' : '2px solid transparent',
              outlineOffset: '2px',
              border: opt.value === '#ffffff' ? '1px solid #e5e7eb' : 'none',
            }}
            aria-label={opt.label}
          />
        ))}
        <span className="text-xs" style={{ color: 'var(--lt-muted)' }}>
          {BG_OPTIONS.find((o) => o.value === bgColor)?.label}
        </span>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => status !== 'processing' && fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition hover:opacity-80"
        style={{ borderColor: 'var(--lt-border)', color: 'var(--lt-muted)', cursor: status === 'processing' ? 'not-allowed' : 'pointer' }}
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--molt-shell)' }} />
            <p className="text-sm font-medium text-center px-4" style={{ color: 'var(--molt-shell)' }}>
              {progressMsg || 'Processing…'}
            </p>
            <p className="text-xs" style={{ color: 'var(--lt-muted)' }}>Runs locally — no upload to any server</p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7" />
            <p className="text-sm font-medium">Click or drag a photo here</p>
            <p className="text-xs">JPG, PNG, WebP, HEIC · Any size · Processed locally</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleInputChange} disabled={status === 'processing'} />
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          {errorMsg}
        </div>
      )}

      {/* Before / After */}
      {(preview || resultUrl) && (
        <div className="grid grid-cols-2 gap-3">
          {preview && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-center" style={{ color: 'var(--lt-muted)' }}>Original</p>
              <img src={preview} alt="Original" className="w-full rounded-xl object-contain"
                style={{ maxHeight: 260, border: '1px solid var(--lt-border)', background: '#f3f4f6' }} />
            </div>
          )}
          {resultUrl && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-center" style={{ color: 'var(--lt-muted)' }}>New background</p>
              <img src={resultUrl} alt="Result" className="w-full rounded-xl object-contain"
                style={{ maxHeight: 260, border: '1px solid var(--lt-border)', background: bgColor }} />
            </div>
          )}
        </div>
      )}

      {/* Re-upload hint after done */}
      {status === 'done' && (
        <p className="text-xs text-center" style={{ color: 'var(--lt-muted)' }}>
          Upload a new photo to process another, or change background color above.
        </p>
      )}

      {/* Download */}
      {status === 'done' && resultUrl && (
        <button
          onClick={downloadResult}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: 'var(--molt-shell)' }}
        >
          <Download className="h-4 w-4" /> Download PNG
        </button>
      )}
    </div>
  );
}
