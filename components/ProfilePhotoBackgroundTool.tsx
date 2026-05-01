'use client';

/**
 * Portrait Background Tool — Commercial-grade edge refinement
 *
 * Architecture:
 * - origCanvas:    full-res original RGB, never modified
 * - alphaMask:     full-res Float32Array (0.0–1.0), only thing the brush edits
 * - previewCanvas: composited display (CSS-scaled, redrawn on every change)
 *
 * This separation prevents black pixels on Restore and ensures export is
 * always full original resolution.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Undo2, Upload } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Red',   value: '#d71920' },
  { label: 'Blue',  value: '#2f5eea' },
  { label: 'Gray',  value: '#6b7280' },
];

const FORMAT_OPTIONS = [
  { label: 'PNG',  mime: 'image/png',  ext: 'png',  quality: undefined },
  { label: 'JPG',  mime: 'image/jpeg', ext: 'jpg',  quality: 0.95 },
  { label: 'WebP', mime: 'image/webp', ext: 'webp', quality: 0.95 },
];

type Provider = 'removebg' | 'photoroom' | 'clipdrop';
type Status    = 'idle' | 'uploading' | 'done' | 'error';
type BrushMode = 'erase' | 'restore';
type ExportFmt = 'png' | 'jpg' | 'webp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Cannot load image'));
    img.src = src;
  });
}

/** Draw RGBA pixel data from an image into a canvas at natural size */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  cv.getContext('2d')!.drawImage(img, 0, 0);
  return cv;
}

/** Extract per-pixel alpha from a transparent PNG image as Float32Array */
function extractAlphaMask(
  subjectImg: HTMLImageElement,
  fullW: number,
  fullH: number,
): Float32Array {
  const cv = document.createElement('canvas');
  cv.width = fullW; cv.height = fullH;
  cv.getContext('2d')!.drawImage(subjectImg, 0, 0, fullW, fullH);
  const px = cv.getContext('2d')!.getImageData(0, 0, fullW, fullH).data;
  const mask = new Float32Array(fullW * fullH);
  for (let i = 0; i < fullW * fullH; i++) {
    mask[i] = px[i * 4 + 3] / 255;
  }
  return mask;
}

/** Composite: origCanvas + alphaMask + bgColor → output canvas */
function compositeToCanvas(
  origCanvas: HTMLCanvasElement,
  alphaMask: Float32Array,
  bgColor: string,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  const [bgR, bgG, bgB] = hexToRgb(bgColor);
  const oc = document.createElement('canvas');
  oc.width = outW; oc.height = outH;
  const oCtx = oc.getContext('2d')!;

  // Get original pixels at output resolution
  const srcCv = document.createElement('canvas');
  srcCv.width = outW; srcCv.height = outH;
  srcCv.getContext('2d')!.drawImage(origCanvas, 0, 0, outW, outH);
  const srcPx = srcCv.getContext('2d')!.getImageData(0, 0, outW, outH).data;

  const outData = oCtx.createImageData(outW, outH);
  const op = outData.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // Map output coords to alphaMask coords (alphaMask is at origCanvas dimensions)
      const mx = Math.min(Math.floor(x * origCanvas.width / outW), origCanvas.width - 1);
      const my = Math.min(Math.floor(y * origCanvas.height / outH), origCanvas.height - 1);
      const a = alphaMask[my * origCanvas.width + mx];

      const fi = (y * outW + x) * 4;
      op[fi]   = Math.round(srcPx[fi]   * a + bgR * (1 - a));
      op[fi+1] = Math.round(srcPx[fi+1] * a + bgG * (1 - a));
      op[fi+2] = Math.round(srcPx[fi+2] * a + bgB * (1 - a));
      op[fi+3] = 255;
    }
  }
  oCtx.putImageData(outData, 0, 0);
  return oc;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfilePhotoBackgroundTool() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [status,    setStatus]    = useState<Status>('idle');
  const [bgColor,   setBgColor]   = useState('#ffffff');
  const [stage,     setStage]     = useState('');
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [warnings,  setWarnings]  = useState<string[]>([]);
  const [usedProvider,  setUsedProvider]  = useState<Provider | null>(null);
  const [fallbacks, setFallbacks] = useState<Provider[]>([]);
  const [skipProviders, setSkipProviders] = useState<Provider[]>([]);

  // ── Brush state ─────────────────────────────────────────────────────────────
  const [refineMode, setRefineMode] = useState(false);
  const [brushMode,  setBrushMode]  = useState<BrushMode>('erase');
  const [brushSize,  setBrushSize]  = useState(30);
  const [brushSoft,  setBrushSoft]  = useState(70);
  const [cursor,     setCursor]     = useState({ visible: false, x: 0, y: 0 });

  // ── Undo state (useState so button re-renders correctly) ─────────────────────
  const [undoStack, setUndoStack] = useState<Float32Array[]>([]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportFmt, setExportFmt] = useState<ExportFmt>('png');

  // ── Refs (don't need re-render) ─────────────────────────────────────────────
  const origCanvasRef  = useRef<HTMLCanvasElement | null>(null);  // full-res original RGB
  const alphaMaskRef   = useRef<Float32Array | null>(null);       // full-res alpha 0–1
  const previewRef     = useRef<HTMLCanvasElement>(null);          // display canvas
  const origImgRef     = useRef<HTMLImageElement | null>(null);
  const origUrl        = useRef<string | null>(null);
  const currentFile    = useRef<File | null>(null);
  const isPainting     = useRef(false);
  const fileRef        = useRef<HTMLInputElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  // ── Rendering ───────────────────────────────────────────────────────────────

  const doRender = useCallback(() => {
    const orig  = origCanvasRef.current;
    const alpha = alphaMaskRef.current;
    const pc    = previewRef.current;
    if (!orig || !alpha || !pc) return;

    // Render at a "display" size (canvas internal pixels = preview display size)
    const MAX = 900;
    const scale = Math.min(1, MAX / Math.max(orig.width, orig.height));
    const dW = Math.round(orig.width * scale);
    const dH = Math.round(orig.height * scale);

    const composed = compositeToCanvas(orig, alpha, bgColor, dW, dH);
    pc.width  = composed.width;
    pc.height = composed.height;
    pc.getContext('2d')!.drawImage(composed, 0, 0);
  }, [bgColor]);

  useEffect(() => { if (status === 'done') doRender(); }, [bgColor, status, doRender]);

  // ── Upload & process ────────────────────────────────────────────────────────

  async function processFile(file: File, skip: Provider[] = []) {
    if (!file.type.startsWith('image/')) { setErrorMsg('Please upload a JPG, PNG, or WebP image.'); return; }
    if (file.size > 12 * 1024 * 1024) { setErrorMsg('Image too large. Max 12 MB.'); return; }

    currentFile.current = file;
    setStatus('uploading'); setErrorMsg(null); setWarnings([]);
    setUsedProvider(null); setFallbacks([]); setRefineMode(false);
    setUndoStack([]);

    if (origUrl.current) URL.revokeObjectURL(origUrl.current);
    origUrl.current = URL.createObjectURL(file);

    try {
      setStage('Removing background…');
      const fd = new FormData();
      fd.append('image', file);
      fd.append('options', JSON.stringify({ qualityMode: 'best', skipProviders: skip }));

      const res = await fetch('/api/photo/remove-background', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const provider  = (res.headers.get('X-Provider') ?? '') as Provider;
      const warnStr   = res.headers.get('X-Quality-Warnings') ?? '';
      const fallbackH = (res.headers.get('X-Available-Fallbacks') ?? '').split(',').filter(Boolean) as Provider[];

      setUsedProvider(provider);
      setFallbacks(fallbackH);
      if (warnStr) setWarnings(warnStr.split(',').filter(Boolean));

      setStage('Loading result…');
      const pngBlob = await res.blob();
      const subjectUrl = URL.createObjectURL(pngBlob);

      const [subjectImg, origImg] = await Promise.all([
        loadImg(subjectUrl),
        loadImg(origUrl.current!),
      ]);
      URL.revokeObjectURL(subjectUrl);
      origImgRef.current = origImg;

      // Store full-res original
      origCanvasRef.current = imageToCanvas(origImg);

      // Extract full-res alpha mask
      alphaMaskRef.current = extractAlphaMask(subjectImg, origImg.naturalWidth, origImg.naturalHeight);

      setStage(''); setStatus('done'); doRender();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Unknown error.');
      setStatus('error'); setStage('');
    }
  }

  async function retryWithFallback() {
    if (!currentFile.current) return;
    const newSkip = usedProvider ? [...skipProviders, usedProvider] : skipProviders;
    setSkipProviders(newSkip);
    await processFile(currentFile.current, newSkip);
  }

  // ── Brush painting on alpha mask ────────────────────────────────────────────

  /** Convert pointer position on previewCanvas (CSS pixels) → alpha mask coords */
  function pointerToMaskCoords(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const cv   = previewRef.current!;
    const rect = cv.getBoundingClientRect();
    const orig = origCanvasRef.current!;
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // CSS display size → canvas pixels → full-res mask coords
    const cvX = cssX * (cv.width  / rect.width);
    const cvY = cssY * (cv.height / rect.height);
    const mx  = Math.round(cvX * (orig.width  / cv.width));
    const my  = Math.round(cvY * (orig.height / cv.height));
    return [mx, my];
  }

  /** Scale brushSize (preview CSS px) to full-res mask pixels */
  function brushRadiusInMask(): number {
    const cv   = previewRef.current;
    const orig = origCanvasRef.current;
    if (!cv || !orig) return brushSize;
    const rect = cv.getBoundingClientRect();
    const scale = orig.width / rect.width;
    return (brushSize / 2) * scale;
  }

  function paintAtMask(mx: number, my: number) {
    const alpha = alphaMaskRef.current;
    const orig  = origCanvasRef.current;
    if (!alpha || !orig) return;

    const W = orig.width;
    const H = orig.height;
    const r = brushRadiusInMask();
    const soft = brushSoft / 100;

    const x0 = Math.max(0, Math.floor(mx - r - 1));
    const y0 = Math.max(0, Math.floor(my - r - 1));
    const x1 = Math.min(W, Math.ceil(mx + r + 1));
    const y1 = Math.min(H, Math.ceil(my + r + 1));

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const dist = Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
        if (dist > r) continue;

        // Softness: 0=hard, 100=gaussian falloff
        const hard = Math.max(0, 1 - dist / r);
        const soft2 = Math.max(0, 1 - (dist / (r * 0.8)) ** 2);
        const t = hard * (1 - soft) + soft2 * soft;

        const idx = py * W + px;
        const cur = alpha[idx];
        alpha[idx] = brushMode === 'erase'
          ? Math.max(0, cur - t)
          : Math.min(1, cur + t);
      }
    }
    doRender();
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!refineMode) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isPainting.current = true;
    // Save undo snapshot at stroke start
    if (alphaMaskRef.current) {
      setUndoStack(prev => [alphaMaskRef.current!.slice(), ...prev].slice(0, 30));
    }
    paintAtMask(...pointerToMaskCoords(e));
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = previewRef.current!.getBoundingClientRect();
    setCursor({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (!refineMode || !isPainting.current) return;
    e.preventDefault();
    paintAtMask(...pointerToMaskCoords(e));
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isPainting.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onPointerLeave() {
    isPainting.current = false;
    setCursor(c => ({ ...c, visible: false }));
  }

  // ── Undo ────────────────────────────────────────────────────────────────────

  function undo() {
    setUndoStack(prev => {
      const [last, ...rest] = prev;
      if (!last) return prev;
      alphaMaskRef.current = last;
      doRender();
      return rest;
    });
  }

  // ── Download ─────────────────────────────────────────────────────────────────

  function download() {
    const orig  = origCanvasRef.current;
    const alpha = alphaMaskRef.current;
    if (!orig || !alpha) return;

    const fmt = FORMAT_OPTIONS.find(f => f.ext === exportFmt)!;
    const composed = compositeToCanvas(orig, alpha, bgColor, orig.width, orig.height);
    const dataUrl = composed.toDataURL(fmt.mime, fmt.quality);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `axio7-portrait.${fmt.ext}`;
    a.click();
  }

  const busy = status === 'uploading';
  const hasWarning = warnings.includes('possible-background-residue') || warnings.includes('large-semi-transparent-region');

  // ── Brush cursor display size (CSS px) ──────────────────────────────────────
  const displayBrushPx = brushSize; // brushSize is already in preview CSS px

  return (
    <div className="rounded-[22px] p-5 space-y-4" style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}>

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>Portrait Background</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--lt-muted)' }}>
          Replace a portrait background with a solid color. Professional AI processing — not stored.
        </p>
      </div>

      {/* Background color picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--lt-muted)' }}>Background:</span>
        {BG_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setBgColor(opt.value)} title={opt.label}
            className="h-8 w-8 rounded-full transition hover:scale-110 active:scale-95"
            style={{ background: opt.value, outline: bgColor === opt.value ? '2.5px solid var(--molt-shell)' : '2px solid transparent', outlineOffset: '2px', border: opt.value === '#ffffff' ? '1px solid #e5e7eb' : 'none' }}
            aria-label={opt.label} />
        ))}
        <span className="text-xs" style={{ color: 'var(--lt-muted)' }}>{BG_OPTIONS.find(o => o.value === bgColor)?.label}</span>
      </div>

      {/* Upload zone */}
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f, []); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => !busy && fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 transition"
        style={{ borderColor: 'var(--lt-border)', color: 'var(--lt-muted)', cursor: busy ? 'default' : 'pointer' }}
      >
        {busy ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--molt-shell)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--molt-shell)' }}>{stage || 'Processing…'}</p>
            <p className="text-xs" style={{ color: 'var(--lt-muted)' }}>Testing multiple AI providers for best result…</p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6" />
            <p className="text-sm font-medium">{status === 'done' ? 'Upload another photo' : 'Click or drag portrait photo here'}</p>
            <p className="text-xs">JPG, PNG, WebP · Max 12 MB</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f, []); e.target.value = ''; }}
          disabled={busy} />
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          {errorMsg}
        </div>
      )}

      {/* Quality warning */}
      {status === 'done' && hasWarning && (
        <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#92400e' }}>
          <p className="text-sm font-semibold">⚠️ Complex background detected</p>
          <p className="text-xs">This photo has a difficult background. Use "Try higher quality" or refine edges manually.</p>
          {fallbacks.length > 0 && (
            <button onClick={retryWithFallback} disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#d97706', color: 'white' }}>
              🔄 Try higher quality ({fallbacks[0]})
            </button>
          )}
        </div>
      )}

      {/* Provider info */}
      {status === 'done' && usedProvider && (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--lt-muted)' }}>
          <span>Processed by: <b style={{ color: 'var(--lt-text)' }}>{usedProvider}</b></span>
          {fallbacks.length > 0 && !hasWarning && (
            <button onClick={retryWithFallback} disabled={busy}
              className="rounded-lg px-2.5 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--lt-text)' }}>
              Try {fallbacks[0]} instead
            </button>
          )}
        </div>
      )}

      {/* Before / After preview */}
      {status === 'done' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {/* Original */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>Original</p>
              <div className="flex justify-center">
                <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--lt-border)', background: 'transparent' }}>
                  {origUrl.current && (
                    <img src={origUrl.current} alt="Original"
                      style={{ display: 'block', width: 'auto', maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
                  )}
                </div>
              </div>
            </div>

            {/* Result with brush cursor overlay */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>
                {refineMode ? (brushMode === 'erase' ? '🧹 Erasing' : '✏️ Restoring') : 'Result'}
              </p>
              <div className="flex justify-center">
                <div
                  ref={previewWrapRef}
                  className="overflow-hidden rounded-xl"
                  style={{
                    position: 'relative',
                    border: refineMode ? '2px solid var(--molt-shell)' : '1px solid var(--lt-border)',
                    background: bgColor,
                  }}
                >
                  <canvas
                    ref={previewRef}
                    style={{
                      display: 'block',
                      width: 'auto',
                      maxWidth: '100%',
                      maxHeight: 420,
                      objectFit: 'contain',
                      cursor: refineMode ? 'none' : 'default',
                      touchAction: 'none',
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerLeave}
                  />

                  {/* Brush cursor circle overlay */}
                  {refineMode && cursor.visible && (
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        width: displayBrushPx,
                        height: displayBrushPx,
                        left: cursor.x - displayBrushPx / 2,
                        top: cursor.y - displayBrushPx / 2,
                        border: `2px solid ${brushMode === 'erase' ? '#dc2626' : '#059669'}`,
                        background: brushMode === 'erase' ? 'rgba(220,38,38,0.10)' : 'rgba(5,150,105,0.10)',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
                        transition: 'width 0.05s, height 0.05s',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edge refinement toolbar */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--lt-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--lt-text)' }}>Edge Refinement</span>
              <button
                onClick={() => { setRefineMode(v => !v); setCursor(c => ({ ...c, visible: false })); }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                style={refineMode
                  ? { background: 'rgba(0,0,0,0.08)', color: 'var(--lt-text)' }
                  : { background: 'var(--molt-shell)', color: 'white' }}>
                {refineMode ? 'Done' : '✏️ Refine edges'}
              </button>
            </div>

            {refineMode && (
              <>
                {/* Mode buttons */}
                <div className="flex gap-2">
                  <button onClick={() => setBrushMode('erase')}
                    className="flex-1 rounded-lg py-2.5 text-xs font-semibold transition"
                    style={brushMode === 'erase'
                      ? { background: '#dc2626', color: 'white' }
                      : { background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                    🧹 Erase residue
                  </button>
                  <button onClick={() => setBrushMode('restore')}
                    className="flex-1 rounded-lg py-2.5 text-xs font-semibold transition"
                    style={brushMode === 'restore'
                      ? { background: '#059669', color: 'white' }
                      : { background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                    ✏️ Restore person
                  </button>
                </div>

                {/* Sliders */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--lt-muted)' }}>
                      Size: {brushSize}px
                    </span>
                    <input type="range" min={2} max={120} value={brushSize}
                      onChange={e => setBrushSize(Number(e.target.value))}
                      className="flex-1" style={{ accentColor: 'var(--molt-shell)' }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--lt-muted)' }}>
                      Softness: {brushSoft}%
                    </span>
                    <input type="range" min={0} max={100} value={brushSoft}
                      onChange={e => setBrushSoft(Number(e.target.value))}
                      className="flex-1" style={{ accentColor: 'var(--molt-shell)' }} />
                  </div>
                </div>

                {/* Undo */}
                <div className="flex items-center gap-2">
                  <button onClick={undo} disabled={undoStack.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 hover:opacity-80"
                    style={{ background: 'rgba(0,0,0,0.07)', color: 'var(--lt-text)' }}>
                    <Undo2 className="h-3.5 w-3.5" /> Undo last stroke
                  </button>
                  {undoStack.length > 0 && (
                    <span className="text-[11px]" style={{ color: 'var(--lt-subtle)' }}>
                      {undoStack.length} step{undoStack.length !== 1 ? 's' : ''} saved
                    </span>
                  )}
                </div>

                <p className="text-[11px]" style={{ color: 'var(--lt-muted)' }}>
                  Move cursor over Result to see brush circle. <b>Erase</b> removes background residue.
                  <b> Restore</b> recovers cut-off person pixels from the original. Adjust <b>Softness</b> for natural edges.
                </p>
              </>
            )}
          </div>

          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--lt-muted)' }}>Format:</span>
            <div className="flex gap-1.5">
              {FORMAT_OPTIONS.map(f => (
                <button key={f.ext} onClick={() => setExportFmt(f.ext as ExportFmt)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={exportFmt === f.ext
                    ? { background: 'var(--molt-shell)', color: 'white' }
                    : { background: 'rgba(0,0,0,0.06)', color: 'var(--lt-muted)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download */}
          <button onClick={download}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--molt-shell)' }}>
            <Download className="h-4 w-4" />
            Download {FORMAT_OPTIONS.find(f => f.ext === exportFmt)?.label} (full resolution)
          </button>

          <p className="text-[11px] text-center" style={{ color: 'var(--lt-subtle)' }}>
            For official documents, review carefully. AXIO7 does not guarantee government approval.
          </p>
        </>
      )}
    </div>
  );
}
