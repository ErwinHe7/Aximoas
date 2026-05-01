'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';

const BG_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Red',   value: '#d71920' },
  { label: 'Blue',  value: '#2f5eea' },
  { label: 'Gray',  value: '#6b7280' },
];

type Status = 'idle' | 'processing' | 'done' | 'error';

// ─── MediaPipe ImageSegmenter (loaded from CDN at runtime) ───────────────────

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

interface MPVision {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  ImageSegmenter: {
    createFromOptions: (resolver: unknown, opts: object) => Promise<MPSegmenter>;
  };
}

interface MPSegmenter {
  segment: (image: HTMLImageElement | HTMLCanvasElement, cb: (result: MPResult) => void) => void;
  close: () => void;
}

interface MPResult {
  confidenceMasks?: Array<{ getAsFloat32Array: () => Float32Array }>;
  categoryMask?: { getAsUint8Array: () => Uint8Array };
}

let cachedVision: MPVision | null = null;
let cachedSegmenter: MPSegmenter | null = null;

async function getSegmenter(): Promise<MPSegmenter> {
  if (cachedSegmenter) return cachedSegmenter;

  if (!cachedVision) {
    // Dynamic CDN import — never bundled by webpack
    cachedVision = await import(/* webpackIgnore: true */ MEDIAPIPE_CDN as string) as unknown as MPVision;
  }

  const vision = cachedVision;
  const resolver = await vision.FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  cachedSegmenter = await vision.ImageSegmenter.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    outputConfidenceMasks: true,
    outputCategoryMask: false,
    runningMode: 'IMAGE',
  });

  return cachedSegmenter;
}

// ─── Core: segment + composite ───────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot load image')); };
    img.src = url;
  });
}

async function segmentAndComposite(
  file: File,
  bgColor: string,
  onStage: (s: string) => void
): Promise<{ resultUrl: string; origW: number; origH: number; maskData: Float32Array }> {
  onStage('Loading image…');
  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  onStage('Loading segmentation model… (first run ~10–20s)');
  const segmenter = await getSegmenter();

  onStage('Segmenting portrait…');
  const maskData = await new Promise<Float32Array>((resolve, reject) => {
    try {
      segmenter.segment(img, (result: MPResult) => {
        const masks = result.confidenceMasks;
        if (!masks || masks.length === 0) {
          reject(new Error('No segmentation mask returned'));
          return;
        }
        resolve(masks[0].getAsFloat32Array());
      });
    } catch (err) {
      reject(err);
    }
  });

  onStage('Compositing background…');

  // Draw original image to get pixel data
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W;
  srcCanvas.height = H;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, W, H);

  // Parse background color
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = 1; tmpCanvas.height = 1;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.fillStyle = bgColor;
  tmpCtx.fillRect(0, 0, 1, 1);
  const [bgR, bgG, bgB] = tmpCtx.getImageData(0, 0, 1, 1).data;

  // Create output canvas: blend subject pixels with background
  const outCanvas = document.createElement('canvas');
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(W, H);
  const outPx = outData.data;
  const srcPx = srcData.data;

  for (let i = 0; i < W * H; i++) {
    // confidence: 1.0 = subject (person), 0.0 = background
    const confidence = maskData[i];
    // Soft blend at edges for natural hair/fringe handling
    const pi = i * 4;
    outPx[pi]     = Math.round(srcPx[pi]     * confidence + bgR * (1 - confidence));
    outPx[pi + 1] = Math.round(srcPx[pi + 1] * confidence + bgG * (1 - confidence));
    outPx[pi + 2] = Math.round(srcPx[pi + 2] * confidence + bgB * (1 - confidence));
    outPx[pi + 3] = 255; // fully opaque output
  }

  outCtx.putImageData(outData, 0, 0);
  const resultUrl = outCanvas.toDataURL('image/png');
  return { resultUrl, origW: W, origH: H, maskData };
}

async function recomposite(
  file: File,
  maskData: Float32Array,
  bgColor: string
): Promise<string> {
  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W; srcCanvas.height = H;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, W, H);

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = 1; tmpCanvas.height = 1;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.fillStyle = bgColor;
  tmpCtx.fillRect(0, 0, 1, 1);
  const [bgR, bgG, bgB] = tmpCtx.getImageData(0, 0, 1, 1).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = W; outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(W, H);
  const outPx = outData.data;
  const srcPx = srcData.data;

  for (let i = 0; i < W * H; i++) {
    const confidence = maskData[i];
    const pi = i * 4;
    outPx[pi]     = Math.round(srcPx[pi]     * confidence + bgR * (1 - confidence));
    outPx[pi + 1] = Math.round(srcPx[pi + 1] * confidence + bgG * (1 - confidence));
    outPx[pi + 2] = Math.round(srcPx[pi + 2] * confidence + bgB * (1 - confidence));
    outPx[pi + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas.toDataURL('image/png');
}

// ─── UI Component ─────────────────────────────────────────────────────────────

export function ProfilePhotoBackgroundTool() {
  const [status, setStatus] = useState<Status>('idle');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stage, setStage] = useState('');

  const maskRef = useRef<Float32Array | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WebP).');
      return;
    }

    currentFileRef.current = file;
    maskRef.current = null;
    const prev = URL.createObjectURL(file);
    setPreviewUrl(prev);
    setStatus('processing');
    setResultUrl(null);
    setErrorMsg(null);

    try {
      const { resultUrl: r, maskData } = await segmentAndComposite(file, bgColor, setStage);
      maskRef.current = maskData;
      setResultUrl(r);
      setStatus('done');
      setStage('');
    } catch (err: any) {
      console.error('[portrait-bg]', err);
      setErrorMsg(
        `Failed: ${err?.message ?? 'Unknown error'}. ` +
        'Try a portrait photo with a clear subject. First load may take 20s to download the AI model.'
      );
      setStatus('error');
      setStage('');
    }
  }

  async function handleColorChange(color: string) {
    setBgColor(color);
    if (maskRef.current && currentFileRef.current && status === 'done') {
      const r = await recomposite(currentFileRef.current, maskRef.current, color);
      setResultUrl(r);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function download() {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'portrait-new-background.png';
    a.click();
  }

  return (
    <div
      className="rounded-[22px] p-5 space-y-4"
      style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)' }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--lt-text)' }}>
          Portrait Background
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--lt-muted)' }}>
          Replace the background with a solid color while keeping the person unchanged.
          Uses AI segmentation — runs locally in your browser, nothing is uploaded.
        </p>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--lt-muted)' }}>Background:</span>
        {BG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleColorChange(opt.value)}
            title={opt.label}
            className="h-8 w-8 rounded-full transition hover:scale-110 active:scale-95"
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

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => status !== 'processing' && fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition"
        style={{
          borderColor: 'var(--lt-border)',
          color: 'var(--lt-muted)',
          cursor: status === 'processing' ? 'default' : 'pointer',
        }}
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--molt-shell)' }} />
            <p className="text-sm font-medium px-6 text-center" style={{ color: 'var(--molt-shell)' }}>
              {stage || 'Processing…'}
            </p>
            <p className="text-xs" style={{ color: 'var(--lt-muted)' }}>
              AI model runs locally — no data leaves your device
            </p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7" />
            <p className="text-sm font-medium">Click or drag a portrait photo here</p>
            <p className="text-xs">JPG, PNG, WebP · Runs locally · First load downloads AI model (~5MB)</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
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
      {(previewUrl || resultUrl) && (
        <div className="grid grid-cols-2 gap-3">
          {previewUrl && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>
                Original
              </p>
              <div
                className="flex items-center justify-center rounded-xl overflow-hidden"
                style={{ background: '#f3f4f6', border: '1px solid var(--lt-border)', minHeight: 160, maxHeight: 280 }}
              >
                <img src={previewUrl} alt="Original"
                  style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
          )}
          {resultUrl && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-center uppercase tracking-wider" style={{ color: 'var(--lt-muted)' }}>
                Result
              </p>
              <div
                className="flex items-center justify-center rounded-xl overflow-hidden"
                style={{ background: bgColor, border: '1px solid var(--lt-border)', minHeight: 160, maxHeight: 280 }}
              >
                <img src={resultUrl} alt="Result"
                  style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <p className="text-xs text-center" style={{ color: 'var(--lt-muted)' }}>
          Tap a color above to switch instantly. Upload a new photo to start over.
        </p>
      )}

      {status === 'done' && resultUrl && (
        <button
          onClick={download}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--molt-shell)' }}
        >
          <Download className="h-4 w-4" />
          Download PNG (full resolution)
        </button>
      )}
    </div>
  );
}
