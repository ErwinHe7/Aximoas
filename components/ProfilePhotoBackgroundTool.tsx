'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, RotateCcw, Upload } from 'lucide-react';

const BG_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Red',   value: '#d71920' },
  { label: 'Blue',  value: '#2f5eea' },
  { label: 'Gray',  value: '#6b7280' },
];

type Status = 'idle' | 'uploading' | 'done' | 'error';
type BrushMode = 'erase' | 'restore';
type ExportFormat = 'png' | 'jpg' | 'webp';

const FORMAT_OPTIONS: { label: string; value: ExportFormat; mime: string; ext: string }[] = [
  { label: 'PNG',  value: 'png',  mime: 'image/png',  ext: 'png'  },
  { label: 'JPG',  value: 'jpg',  mime: 'image/jpeg', ext: 'jpg'  },
  { label: 'WebP', value: 'webp', mime: 'image/webp', ext: 'webp' },
];

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

/**
 * maskCanvas: stores subject RGBA at preview scale.
 * R,G,B = original pixel color; A = alpha from API transparent PNG (0=bg, 255=person).
 * We draw the transparent PNG directly — the alpha channel IS the mask.
 */
function buildMaskCanvas(
  mc: HTMLCanvasElement,
  subjectImg: HTMLImageElement,  // transparent PNG from API (already has correct alpha)
  origImg: HTMLImageElement,     // original photo (for RGB pixel colors)
  prevW: number, prevH: number,
) {
  mc.width = prevW;
  mc.height = prevH;
  const ctx = mc.getContext('2d', { willReadFrequently: true })!;

  // Draw original for pixel colors
  ctx.drawImage(origImg, 0, 0, prevW, prevH);
  const imgData = ctx.getImageData(0, 0, prevW, prevH);

  // Draw subject (transparent PNG) to extract alpha mask
  const alphaCv = document.createElement('canvas');
  alphaCv.width = prevW; alphaCv.height = prevH;
  const aCtx = alphaCv.getContext('2d')!;
  aCtx.drawImage(subjectImg, 0, 0, prevW, prevH);
  const alphaData = aCtx.getImageData(0, 0, prevW, prevH).data;

  // Merge: use original RGB + API alpha
  for (let i = 0; i < prevW * prevH; i++) {
    imgData.data[i * 4 + 3] = alphaData[i * 4 + 3]; // alpha from API result
  }
  ctx.putImageData(imgData, 0, 0);
}

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

function exportFullRes(mc: HTMLCanvasElement, origImg: HTMLImageElement, bgColor: string, mime = 'image/png', quality = 0.97): string {
  const [bgR, bgG, bgB] = hexToRgb(bgColor);
  const fW = origImg.naturalWidth; const fH = origImg.naturalHeight;
  const pW = mc.width; const pH = mc.height;

  const sc = document.createElement('canvas'); sc.width = fW; sc.height = fH;
  sc.getContext('2d')!.drawImage(origImg, 0, 0);
  const sPx = sc.getContext('2d')!.getImageData(0, 0, fW, fH).data;

  const mPx = mc.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, pW, pH).data;

  const oc = document.createElement('canvas'); oc.width = fW; oc.height = fH;
  const oCtx = oc.getContext('2d')!;
  const od = oCtx.createImageData(fW, fH); const op = od.data;

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
  return oc.toDataURL(mime, quality);
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_PREVIEW = 900;

export function ProfilePhotoBackgroundTool() {
  const [status, setStatus] = useState<Status>('idle');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [stage, setStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refineMode, setRefineMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
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
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Image too large. Max 10 MB.'); return; }

    setStatus('uploading'); setErrorMsg(null); setRefineMode(false); undoStack.current = [];
    if (origUrl.current) URL.revokeObjectURL(origUrl.current);
    origUrl.current = URL.createObjectURL(file);

    try {
      setStage('Removing background…');
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/photo/remove-background', { method: 'POST', body: fd });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      setStage('Processing result…');
      const pngBlob = await res.blob();
      const subjectUrl = URL.createObjectURL(pngBlob);

      const [subjectImg, origImg] = await Promise.all([
        loadImg(subjectUrl),
        loadImg(origUrl.current!),
      ]);
      URL.revokeObjectURL(subjectUrl);
      origImgRef.current = origImg;

      const scale = Math.min(1, MAX_PREVIEW / Math.max(origImg.naturalWidth, origImg.naturalHeight));
      const prevW = Math.round(origImg.naturalWidth * scale);
      const prevH = Math.round(origImg.naturalHeight * scale);

      buildMaskCanvas(maskRef.current!, subjectImg, origImg, prevW, prevH);
      setStage(''); setStatus('done'); doRender();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Unknown error. Please try again.');
      setStatus('error'); setStage('');
    }
  }

  // ── Brush ─────────────────────────────────────────────────────────────────

  function canvasXY(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const cv = previewRef.current!; const r = cv.getBoundingClientRect();
    return [(e.clientX-r.left)*(cv.width/r.width), (e.clientY-r.top)*(cv.height/r.height)];
  }

  function pushUndo() {
    const mc = maskRef.current!;
    const ctx = mc.getContext('2d', { willReadFrequently: true })!;
    undoStack.current = [ctx.getImageData(0,0,mc.width,mc.height), ...undoStack.current.slice(0,29)];
  }

  function paintAt(x: number, y: number) {
    const mc = maskRef.current!;
    const ctx = mc.getContext('2d', { willReadFrequently: true })!;
    const r = brushSize / 2;
    const x0=Math.max(0,Math.floor(x-r-1)), y0=Math.max(0,Math.floor(y-r-1));
    const x1=Math.min(mc.width,Math.ceil(x+r+1)), y1=Math.min(mc.height,Math.ceil(y+r+1));
    const patch = ctx.getImageData(x0,y0,x1-x0,y1-y0);
    const d = patch.data;
    for (let iy=0; iy<patch.height; iy++) {
      for (let ix=0; ix<patch.width; ix++) {
        const dist = Math.sqrt((ix+x0-x)**2+(iy+y0-y)**2);
        if (dist > r) continue;
        const t = Math.max(0, 1-Math.max(0,dist-(r-2))/2);
        const idx = (iy*patch.width+ix)*4;
        d[idx+3] = brushMode==='erase'
          ? Math.round(d[idx+3]*(1-t))
          : Math.min(255, Math.round(d[idx+3]+255*t));
      }
    }
    ctx.putImageData(patch,x0,y0);
    doRender();
  }

  function onMD(e: React.MouseEvent<HTMLCanvasElement>) { if (!refineMode) return; e.preventDefault(); isPainting.current=true; pushUndo(); paintAt(...canvasXY(e)); }
  function onMM(e: React.MouseEvent<HTMLCanvasElement>) { if (!refineMode||!isPainting.current) return; e.preventDefault(); paintAt(...canvasXY(e)); }
  function onMU() { isPainting.current=false; }

  function undo() {
    if (!undoStack.current.length) return;
    maskRef.current!.getContext('2d',{willReadFrequently:true})!.putImageData(undoStack.current[0],0,0);
    undoStack.current = undoStack.current.slice(1);
    doRender();
  }

  function download() {
    const mc = maskRef.current; const orig = origImgRef.current;
    if (!mc || !orig) return;
    const fmt = FORMAT_OPTIONS.find(f => f.value === exportFormat)!;
    const quality = exportFormat === 'png' ? undefined : 0.97;
    const dataUrl = exportFullRes(mc, orig, bgColor, fmt.mime, quality);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `axio7-portrait-background.${fmt.ext}`;
    a.click();
  }

  const busy = status === 'uploading';

  return (
    <div className="rounded-[22px] p-5 space-y-5" style={{ background:'var(--lt-surface)', border:'1px solid var(--lt-border)' }}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color:'var(--lt-text)' }}>Portrait Background</h2>
        <p className="mt-0.5 text-sm" style={{ color:'var(--lt-muted)' }}>
          Replace a portrait background with a solid color for ID photos, headshots, or profile pictures.
        </p>
        <p className="mt-1 text-xs" style={{ color:'var(--lt-subtle)' }}>
          Images are processed through a professional background removal service and are not stored by AXIO7.
          For official documents, review the result carefully before download.
        </p>
      </div>

      {/* Color */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color:'var(--lt-muted)' }}>Background:</span>
        {BG_OPTIONS.map(opt => (
          <button key={opt.value} onClick={()=>setBgColor(opt.value)} title={opt.label}
            className="h-8 w-8 rounded-full transition hover:scale-110 active:scale-95"
            style={{ background:opt.value, outline:bgColor===opt.value?'2.5px solid var(--molt-shell)':'2px solid transparent', outlineOffset:'2px', border:opt.value==='#ffffff'?'1px solid #e5e7eb':'none' }}
            aria-label={opt.label} />
        ))}
        <span className="text-xs" style={{ color:'var(--lt-muted)' }}>{BG_OPTIONS.find(o=>o.value===bgColor)?.label}</span>
      </div>

      {/* Upload */}
      <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)processFile(f);}} onDragOver={e=>e.preventDefault()}
        onClick={()=>!busy&&fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 transition"
        style={{ borderColor:'var(--lt-border)', color:'var(--lt-muted)', cursor:busy?'default':'pointer' }}>
        {busy ? (
          <><Loader2 className="h-7 w-7 animate-spin" style={{ color:'var(--molt-shell)' }} />
            <p className="text-sm font-medium" style={{ color:'var(--molt-shell)' }}>{stage||'Processing…'}</p></>
        ) : (
          <><Upload className="h-6 w-6" />
            <p className="text-sm font-medium">{status==='done'?'Upload another photo':'Click or drag portrait photo here'}</p>
            <p className="text-xs">JPG, PNG, WebP · Max 10 MB</p></>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only"
          onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value='';}} disabled={busy} />
      </div>

      {errorMsg && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,0.07)', border:'1px solid rgba(220,38,38,0.2)', color:'#dc2626' }}>
          {errorMsg}
        </div>
      )}

      <canvas ref={maskRef} style={{ display:'none' }} />

      {status === 'done' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color:'var(--lt-muted)' }}>Original</p>
              <div className="flex items-center justify-center rounded-xl overflow-hidden" style={{ background:'#f3f4f6', border:'1px solid var(--lt-border)', minHeight:140 }}>
                {origUrl.current && <img src={origUrl.current} alt="Original" style={{ maxWidth:'100%', maxHeight:280, objectFit:'contain', display:'block' }} />}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color:'var(--lt-muted)' }}>
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

          {/* Refine toolbar */}
          <div className="rounded-xl p-3 space-y-3" style={{ background:'rgba(0,0,0,0.04)', border:'1px solid var(--lt-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color:'var(--lt-text)' }}>Edge Refinement</span>
              <button onClick={()=>setRefineMode(v=>!v)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                style={refineMode?{background:'rgba(0,0,0,0.08)',color:'var(--lt-text)'}:{background:'var(--molt-shell)',color:'white'}}>
                {refineMode?'Done':'✏️ Refine edges'}
              </button>
            </div>
            {refineMode && (<>
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
                Paint on Result. <b>Erase</b> removes leftover background; <b>Restore</b> recovers cut edges.
              </p>
            </>)}
          </div>

          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--lt-muted)' }}>Format:</span>
            <div className="flex gap-1.5">
              {FORMAT_OPTIONS.map(f => (
                <button key={f.value} onClick={() => setExportFormat(f.value)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={exportFormat === f.value
                    ? { background: 'var(--molt-shell)', color: 'white' }
                    : { background: 'rgba(0,0,0,0.06)', color: 'var(--lt-muted)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={download}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--molt-shell)' }}>
            <Download className="h-4 w-4" />
            Download {FORMAT_OPTIONS.find(f => f.value === exportFormat)?.label} (full resolution)
          </button>
          <p className="text-[11px] text-center" style={{ color:'var(--lt-subtle)' }}>
            For official documents, review carefully. AXIO7 does not guarantee government approval.
          </p>
        </>
      )}
    </div>
  );
}
