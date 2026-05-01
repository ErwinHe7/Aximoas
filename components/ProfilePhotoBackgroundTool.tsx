'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/browser/index.mjs';

const BG_OPTIONS = [
  { label: 'White',  value: '#ffffff' },
  { label: 'Red',    value: '#e53e3e' },
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Gray',   value: '#6b7280' },
];

type Status = 'idle' | 'processing' | 'done' | 'error';

declare global {
  interface Window {
    __imglyBgRemoval?: { removeBackground: (src: Blob, opts?: object) => Promise<Blob> };
  }
}

async function loadBgRemoval() {
  if (window.__imglyBgRemoval) return window.__imglyBgRemoval;
  // Dynamic ESM import from CDN — bypasses Next.js bundler entirely
  const mod = await import(/* webpackIgnore: true */ CDN_URL as string) as any;
  window.__imglyBgRemoval = mod;
  return mod as { removeBackground: (src: Blob, opts?: object) => Promise<Blob> };
}

async function compositeImage(subjectBlob: Blob, bgColor: string): Promise<string> {
  const url = URL.createObjectURL(subjectBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return canvas.toDataURL('image/png');
}

export function ProfilePhotoBackgroundTool() {
  const [status, setStatus] = useState<Status>('idle');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Keep the removed-background blob so we can re-composite when bg changes
  const subjectBlobRef = useRef<Blob | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    setStatus('processing');
    setResultUrl(null);
    setErrorMsg(null);
    subjectBlobRef.current = null;

    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);

    try {
      const { removeBackground } = await loadBgRemoval();
      const resultBlob = await removeBackground(file);
      subjectBlobRef.current = resultBlob;
      const finalUrl = await compositeImage(resultBlob, bgColor);
      setResultUrl(finalUrl);
      setStatus('done');
    } catch (err: any) {
      console.error('[bg-removal]', err);
      setErrorMsg('Processing failed. Try a clearer photo with a visible subject (portrait works best).');
      setStatus('error');
    }
  }

  // Re-composite with new color when bg changes (only if we already have the subject)
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
    <div
      className="rounded-[22px] p-5 space-y-4"
      style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>
          Photo Background
        </h2>
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
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition hover:opacity-80"
        style={{ borderColor: 'var(--lt-border)', color: 'var(--lt-muted)' }}
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--molt-shell)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--molt-shell)' }}>
              Removing background… 10–40s
            </p>
            <p className="text-xs" style={{ color: 'var(--lt-muted)' }}>
              Runs locally in your browser — no upload to any server
            </p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7" />
            <p className="text-sm font-medium">Click or drag a photo here</p>
            <p className="text-xs">JPG, PNG, WebP · Processed locally</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleInputChange}
          disabled={status === 'processing'}
        />
      </div>

      {/* Error */}
      {errorMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}
        >
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

      {/* Download */}
      {status === 'done' && resultUrl && (
        <button
          onClick={downloadResult}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: 'var(--molt-shell)' }}
        >
          <Download className="h-4 w-4" />
          Download PNG
        </button>
      )}
    </div>
  );
}
