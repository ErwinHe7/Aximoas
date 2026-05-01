'use client';

/**
 * Portrait Background Tool
 *
 * Uses RMBG-1.4 via @huggingface/transformers loaded from CDN at runtime.
 * The package is NOT in package.json — loaded via script tag + dynamic import
 * so Vercel's Node File Tracer never sees onnxruntime-node (354MB).
 *
 * For production scale: swap the API route to remove.bg/Photoroom for
 * guaranteed quality. This browser-only path is free but ~150MB first load.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, RotateCcw, Upload } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Red',   value: '#d71920' },
  { label: 'Blue',  value: '#2f5eea' },
  { label: 'Gray',  value: '#6b7280' },
];

// CDN URL — loaded at browser runtime, never bundled by webpack
const HF_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';

type Status = 'idle' | 'processing' | 'done' | 'error';
type BrushMode = 'erase' | 'restore';

// ─── Load HuggingFace via script tag (bypasses webpack entirely) ──────────────

let hfLoadPromise: Promise<any> | null = null;

function loadHuggingFace(): Promise<any> {
  if (hfLoadPromise) return hfLoadPromise;
  hfLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).__HF_TRANSFORMERS__) {
      resolve((window as any).__HF_TRANSFORMERS__);
      return;
    }
    const script = document.createElement('script');
    script.src = HF_CDN;
    script.type = 'module';
    script.onload = () => {
      // After module script loads, import it
      const fn = new Function('return import("' + HF_CDN + '")');
      fn().then((mod: any) => {
        (window as any).__HF_TRANSFORMERS__ = mod;
        resolve(mod);
      }).catch(reject);
    };
    script.onerror = () => reject(new Error('Failed to load HuggingFace transformers from CDN'));
    document.head.appendChild(script);
  });
  return hfLoadPromise;
}

// ─── Singleton pipeline ───────────────────────────────────────────────────────

let pipelinePromise: Promise<any> | null = null;

async function getPipeline(onStage: (s: string) => void): Promise<any> {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    onStage('Loading AI library from CDN…');
    const mod = await loadHuggingFace();
    const { pipeline, env } = mod;
    if (env?.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }
    onStage('Downloading RMBG-1.4 model… (~150MB, cached after first run)');
    return await pipeline('image-segmentation', 'Xenova/rmbg-1.4', { quantized: true });
  })();
  return pipelinePromise;
}

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target!.result as string);
    r.onerror = () => rej(new Error('Cannot read file'));
    r.readAsDataURL(file);
  });
}

// ─── Build mask canvas ────────────────────────────────────────────────────────
// Stores subject RGBA at preview scale: RGB=original pixel, A=segmentation confidence

function buildMaskCanvas(
  mc: HTMLCanvasElement,
  origImg: HTMLImageElement,
  alphaBuf: Uint8ClampedArray,
  maskW: number, maskH: number,
  prevW: number, prevH: number,
) {
  mc.width = prevW;
  mc.height = prevH;
  const ctx = mc.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(origImg, 0, 0, prevW, prevH);
  const id = ctx.getImageData(0, 0, prevW, prevH);
  const px = id.data;
  const sx = maskW / prevW;
  const sy = maskH / prevH;
  for (let y = 0; y < prevH; y++) {
    for (let x = 0; x < prevW; x++) {
      const mx = Math.min(Math.floor(x * sx), maskW - 1);
      const my = Math.min(Math.floor(y * sy), maskH - 1);
      px[(y * prevW + x) * 4 + 3] = alphaBuf[my * maskW + mx];
    }
  }
  ctx.putImageData(id, 0, 0);
}

// ─── Render preview ───────────────────────────────────────────────────────────

function renderPreview(mc: HTMLCanvasElement, pc: HTMLCanvasElement, bgColor: string) {
  const W = mc.width; const H = mc.height;
  if (!W || !H) return;
  const [bgR, bgG, bgB] = hexToRgb(bgColor);
  pc.width = W; pc.height = H;
  const mCtx = mc.getContext('2d', { willReadFrequently: true })!;
  const pCtx = pc.getContext('2d')!;
  const md = mCtx.getImageData(0, 0, W, H).data;
  const out = pCtx.createImageData(W, H);
  const op = out.data;
  for (let i = 0; i < W * H; i++) {
    const a = md[i*4+3] / 255;
    const p = i * 4;
    op[p]   = Math.round(md[p]   * a + bgR * (1-a));
    op[p+1] = Math.round(md[p+1] * a + bgG * (1-a));
    op[p+2] = Math.round(md[p+2] * a + bgB * (1-a));
    op[p+3] = 255;
  }
  pCtx.putImageData(out, 0, 0);
}

// ─── Export full-resolution PNG ───────────────────────────────────────────────

function exportFullRes(mc: HTMLCanvasElement, origImg: HTMLImageElement, bgColor: string): string {
  const [bgR, bgG, bgB] = hexToRgb(bgColor);
  const fW = origImg.naturalWidth; const fH = origImg.naturalHeight;
  const pW = mc.width; const pH = mc.height;

  const sc = document.createElement('canvas'); sc.width = fW; sc.height = fH;
  const sCtx = sc.getContext('2d')!;
  sCtx.drawImage(origImg, 0, 0);
  const sPx = sCtx.getImageData(0, 0, fW, fH).data;

  const mCtx = mc.getContext('2d', { willReadFrequently: true })!;
  const mPx = mCtx.getImageData(0, 0, pW, pH).data;

  const oc = document.createElement('canvas'); oc.width = fW; oc.height = fH;
  const oCtx = oc.getContext('2d')!;
  const od = oCtx.createImageData(fW, fH);
  const op = od.data;

  for (let fy = 0; fy < fH; fy++) {
    for (let fx = 0; fx < fW; fx++) {
      const py = Math.min(Math.floor(fy * pH / fH), pH-1);
      const px2 = Math.min(Math.floor(fx * pW / fW), pW-1);
      const a = mPx[(py * pW + px2) * 4 + 3] / 255;
      const fi = (fy * fW + fx) * 4;
      op[fi]   = Math.round(sPx[fi]   * a + bgR * (1-a));
      op[fi+1] = Math.round(sPx[fi+1] * a + bgG * (1-a));
      op[fi+2] = Math.round(sPx[fi+2] * a + bgB * (1-a));
      op[fi+3] = 255;
    }
  }
  oCtx.putImageData(od, 0, 0);
  return oc.toDataURL('image/png');
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_PREVIEW = 900;

export function ProfilePhotoBackgroundTool() {
  const [status, setStatus] = useState<Status>('idle');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [stage, setStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refineMode, setRefineMode] = useState(false);
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [brushSize, setBrushSize] = useState(24);

  const maskRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const origUrl = useRef<string | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const isPainting = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doRender = useCallback(() => {
    const mc = maskRef.current; const pc = previewRef.current;
    if (mc && pc && mc.width) renderPreview(mc, pc, bgColor);
  }, [bgColor]);

  useEffect(() => { if (status === 'done') doRender(); }, [bgColor, status, doRender]);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) { setErrorMsg('Please upload a JPG, PNG, or WebP image.'); return; }
    setStatus('processing'); setErrorMsg(null); setRefineMode(false); undoStack.current = [];
    if (origUrl.current) URL.revokeObjectURL(origUrl.current);
    origUrl.current = URL.createObjectURL(file);

    try {
      const pipe = await getPipeline(setStage);
      setStage('Segmenting portrait…');
      const dataUrl = await fileToDataUrl(file);
      const result = await pipe(dataUrl);
      const seg = Array.isArray(result) ? result[0] : result;
      if (!seg?.mask) throw new Error('Model returned no segmentation mask');
      const mask = seg.mask as { width: number; height: number; data: Uint8ClampedArray };
      setStage('Compositing…');
      const origImg = await loadImg(dataUrl);
      origImgRef.current = origImg;
      const scale = Math.min(1, MAX_PREVIEW / Math.max(origImg.naturalWidth, origImg.naturalHeight));
      const prevW = Math.round(origImg.naturalWidth * scale);
      const prevH = Math.round(origImg.naturalHeight * scale);
      buildMaskCanvas(maskRef.current!, origImg, mask.data, mask.width, mask.height, prevW, prevH);
      setStage(''); setStatus('done'); doRender();
    } catch (err: any) {
      console.error('[rmbg]', err);
      setErrorMsg(`Failed: ${err?.message ?? 'unknown'}. Try a smaller image or clearer portrait.`);
      setStatus('error'); setStage('');
      pipelinePromise = null; // reset so user can retry
    }
  }

  function canvasXY(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const cv = previewRef.current!; const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)];
  }

  function pushUndo() {
    const mc = maskRef.current!;
    const ctx = mc.getContext('2d', { willReadFrequently: true })!;
    undoStack.current = [ctx.getImageData(0, 0, mc.width, mc.height), ...undoStack.current.slice(0, 29)];
  }

  function paintAt(x: number, y: number) {
    const mc = maskRef.current!;
    const ctx = mc.getContext('2d', { willReadFrequently: true })!;
    const r = brushSize / 2;
    const x0 = Math.max(0, Math.floor(x-r-1)), y0 = Math.max(0, Math.floor(y-r-1));
    const x1 = Math.min(mc.width, Math.ceil(x+r+1)), y1 = Math.min(mc.height, Math.ceil(y+r+1));
    const patch = ctx.getImageData(x0, y0, x1-x0, y1-y0);
    const d = patch.data;
    for (let iy = 0; iy < patch.height; iy++) {
      for (let ix = 0; ix < patch.width; ix++) {
        const dist = Math.sqrt((ix+x0-x)**2 + (iy+y0-y)**2);
        if (dist > r) continue;
        const t = Math.max(0, 1 - Math.max(0, dist-(r-2))/2);
        const idx = (iy*patch.width+ix)*4;
        const cur = d[idx+3];
        d[idx+3] = brushMode === 'erase' ? Math.round(cur*(1-t)) : Math.min(255, Math.round(cur+255*t));
      }
    }
    ctx.putImageData(patch, x0, y0);
    doRender();
  }

  function onMD(e: React.MouseEvent<HTMLCanvasElement>) { if (!refineMode) return; e.preventDefault(); isPainting.current = true; pushUndo(); paintAt(...canvasXY(e)); }
  function onMM(e: React.MouseEvent<HTMLCanvasElement>) { if (!refineMode || !isPainting.current) return; e.preventDefault(); paintAt(...canvasXY(e)); }
  function onMU() { isPainting.current = false; }

  function undo() {
    if (!undoStack.current.length) return;
    maskRef.current!.getContext('2d', { willReadFrequently: true })!.putImageData(undoStack.current[0], 0, 0);
    undoStack.current = undoStack.current.slice(1);
    doRender();
  }

  function download() {
    const mc = maskRef.current; const orig = origImgRef.current;
    if (!mc || !orig) return;
    const a = document.createElement('a');
    a.href = exportFullRes(mc, orig, bgColor);
    a.download = 'axio7-portrait-background.png';
    a.click();
  }

  const busy = status === 'processing';

  return (
    <div className="rounded-[22px] p-5 space-y-5" style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>Portrait Background</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--lt-muted)' }}>
          Replace a portrait background with a solid color. Runs in your browser — nothing is uploaded.
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--lt-subtle)' }}>
          For official documents, review the final image carefully. AXIO7 does not guarantee government approval.
        </p>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--lt-muted)' }}>Background:</span>
        {BG_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setBgColor(opt.value)} title={opt.label}
            className="h-8 w-8 rounded-full transition hover:scale-110 active:scale-95"
            style={{ background: opt.value, outline: bgColor===opt.value ? '2.5px solid var(--molt-shell)' : '2px solid transparent', outlineOffset: '2px', border: opt.value==='#ffffff' ? '1px solid #e5e7eb' : 'none' }}
            aria-label={opt.label} />
        ))}
        <span className="text-xs" style={{ color: 'var(--lt-muted)' }}>{BG_OPTIONS.find(o=>o.value===bgColor)?.label}</span>
      </div>

      {/* Upload */}
      <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)processFile(f);}} onDragOver={e=>e.preventDefault()}
        onClick={() => !busy && fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 transition"
        style={{ borderColor: 'var(--lt-border)', color: 'var(--lt-muted)', cursor: busy ? 'default' : 'pointer' }}>
        {busy ? (
          <><Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--molt-shell)' }} />
            <p className="text-sm font-medium px-6 text-center" style={{ color: 'var(--molt-shell)' }}>{stage||'Processing…'}</p>
            <p className="text-xs" style={{ color: 'var(--lt-muted)' }}>Nothing leaves your device</p></>
        ) : (
          <><Upload className="h-6 w-6" />
            <p className="text-sm font-medium">{status==='done'?'Upload another photo':'Click or drag portrait photo here'}</p>
            <p className="text-xs">JPG, PNG, WebP · First run downloads ~150MB AI model (cached)</p></>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only"
          onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value='';}} disabled={busy} />
      </div>

      {errorMsg && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,0.07)', border:'1px solid rgba(220,38,38,0.2)', color:'#dc2626' }}>
          {errorMsg}
        </div>
      )}

      {/* Hidden mask canvas — must stay in DOM */}
      <canvas ref={maskRef} style={{ display: 'none' }} />

      {status === 'done' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>Original</p>
              <div className="flex items-center justify-center rounded-xl overflow-hidden" style={{ background:'#f3f4f6', border:'1px solid var(--lt-border)', minHeight:140 }}>
                {origUrl.current && <img src={origUrl.current} alt="Original" style={{ maxWidth:'100%', maxHeight:280, objectFit:'contain', display:'block' }} />}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>
                {refineMode ? `✏️ ${brushMode==='erase'?'Erasing':'Restoring'}` : 'Result'}
              </p>
              <div className="flex items-center justify-center rounded-xl overflow-hidden"
                style={{ background:bgColor, border:refineMode?'2px solid var(--molt-shell)':'1px solid var(--lt-border)', minHeight:140 }}>
                <canvas ref={previewRef}
                  style={{ maxWidth:'100%', maxHeight:280, display:'block', cursor:refineMode?(brushMode==='erase'?'cell':'crosshair'):'default', touchAction:'none' }}
                  onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} />
              </div>
            </div>
          </div>

          {/* Refine */}
          <div className="rounded-xl p-3 space-y-3" style={{ background:'rgba(0,0,0,0.04)', border:'1px solid var(--lt-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color:'var(--lt-text)' }}>Edge Refinement</span>
              <button onClick={()=>setRefineMode(v=>!v)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                style={refineMode?{background:'rgba(0,0,0,0.08)',color:'var(--lt-text)'}:{background:'var(--molt-shell)',color:'white'}}>
                {refineMode ? 'Done' : '✏️ Refine edges'}
              </button>
            </div>
            {refineMode && (
              <>
                <div className="flex gap-2">
                  <button onClick={()=>setBrushMode('erase')} className="flex-1 rounded-lg py-2 text-xs font-semibold transition"
                    style={brushMode==='erase'?{background:'#dc2626',color:'white'}:{background:'rgba(220,38,38,0.08)',color:'#dc2626'}}>
                    🧹 Erase residue</button>
                  <button onClick={()=>setBrushMode('restore')} className="flex-1 rounded-lg py-2 text-xs font-semibold transition"
                    style={brushMode==='restore'?{background:'#059669',color:'white'}:{background:'rgba(5,150,105,0.08)',color:'#059669'}}>
                    ✏️ Restore person</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs w-16 flex-shrink-0" style={{ color:'var(--lt-muted)' }}>Brush: {brushSize}px</span>
                  <input type="range" min={4} max={80} value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))}
                    className="flex-1" style={{ accentColor:'var(--molt-shell)' }} />
                </div>
                <button onClick={undo} disabled={!undoStack.current.length}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 hover:opacity-80"
                  style={{ background:'rgba(0,0,0,0.07)', color:'var(--lt-text)' }}>
                  <RotateCcw className="h-3.5 w-3.5" /> Undo
                </button>
                <p className="text-[11px]" style={{ color:'var(--lt-muted)' }}>
                  Paint on Result. <b>Erase</b> removes leftover bg; <b>Restore</b> recovers cut edges.
                </p>
              </>
            )}
          </div>

          <button onClick={download}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background:'var(--molt-shell)' }}>
            <Download className="h-4 w-4" /> Download full-resolution PNG
          </button>
          <p className="text-[11px] text-center" style={{ color:'var(--lt-subtle)' }}>
            For official documents, review carefully. AXIO7 does not guarantee government approval.
          </p>
        </>
      )}
    </div>
  );
}
