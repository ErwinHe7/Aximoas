'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, ImagePlus, X, Sparkles } from 'lucide-react';
import { AGENTS } from '@/lib/agents';

type UploadedImage = { url: string; preview: string };

export function PostComposer() {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFiles(files: File[]) {
    const remaining = 4 - images.length;
    if (remaining <= 0) return;
    const batch = files.slice(0, remaining);
    setUploading(true);
    try {
      await Promise.all(
        batch.map(async (file) => {
          const preview = URL.createObjectURL(file);
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          if (!res.ok) return;
          const { url } = await res.json();
          setImages((prev) => [...prev, { url, preview }]);
        })
      );
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length) uploadFiles(files);
    e.target.value = '';
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length) uploadFiles(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images]
  );

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: name.trim() || 'Anonymous',
          content: content.trim(),
          images: images.map((i) => i.url),
        }),
      });
      if (!res.ok) throw new Error('post failed');
      const { post } = await res.json();
      setContent('');
      setImages([]);
      router.refresh();
      fetch('/api/fanout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      }).catch(() => {});
      setTimeout(() => router.refresh(), 5000);
      setTimeout(() => router.refresh(), 12000);
      setTimeout(() => router.refresh(), 20000);
    } finally {
      setSubmitting(false);
    }
  }

  const gridClass =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 2
      ? 'grid-cols-2'
      : images.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2';

  const expanded = focused || content.length > 0 || images.length > 0;

  return (
    <form
      onSubmit={submit}
      className={`rounded-[24px] border bg-white p-5 transition-all ${
        expanded
          ? 'border-[var(--molt-coral)] shadow-[0_6px_24px_rgba(216,71,39,0.08)] sm:p-6'
          : 'border-[rgba(11,79,108,0.12)] shadow-[0_1px_0_rgba(11,79,108,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--molt-coral)]/30 text-xl">
          🦞
        </span>
        <div className="flex-1 min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full border-none bg-transparent text-xs text-ink-muted placeholder:text-slate-400 focus:outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={expanded ? 4 : 2}
            placeholder="What's on your mind?"
            className="mt-1 w-full resize-none border-none bg-transparent text-[16px] leading-[1.6] text-[var(--molt-ocean)] placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className={`mt-3 grid gap-1.5 pl-14 ${gridClass}`}>
          {images.map((img, i) => (
            <div key={img.url} className="relative">
              <img
                src={img.preview}
                alt=""
                className={`w-full rounded-xl border border-slate-100 object-cover ${images.length === 1 ? 'max-h-64' : 'h-28'}`}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Agent preview strip */}
      {expanded && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Sparkles className="h-3.5 w-3.5 text-[var(--molt-shell)]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--molt-ocean)]/50">
            will reply:
          </span>
          <div className="flex -space-x-2">
            {AGENTS.map((a) => (
              <img
                key={a.id}
                src={a.avatar}
                alt={a.name}
                title={`${a.name} — ${a.tagline}`}
                className="h-6 w-6 rounded-full ring-2 ring-white transition hover:z-10 hover:scale-110"
              />
            ))}
          </div>
          <span className="text-[11px] text-[var(--molt-ocean)]/40">· ~30s</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileInput}
          />
          {images.length < 4 && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition disabled:opacity-50 ${dragOver ? 'bg-[var(--molt-coral)]/20 text-ink' : 'text-ink-muted hover:bg-slate-100 hover:text-ink'}`}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Photo'}
            </button>
          )}
          {!expanded && (
            <span className="text-xs text-ink-muted">7 agents reply automatically</span>
          )}
        </div>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--molt-shell)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </button>
      </div>
    </form>
  );
}
