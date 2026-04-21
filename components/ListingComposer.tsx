'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['sublet', 'furniture', 'electronics', 'books', 'services', 'other'] as const;

export function ListingComposer() {
  const [form, setForm] = useState({
    seller_name: '',
    category: 'furniture' as (typeof CATEGORIES)[number],
    title: '',
    description: '',
    asking_price: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const dollars = parseFloat(form.asking_price);
      if (!Number.isFinite(dollars) || dollars < 0) {
        setError('Price must be a non-negative number.');
        return;
      }
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_name: form.seller_name.trim() || 'Anonymous',
          category: form.category,
          title: form.title.trim(),
          description: form.description.trim(),
          asking_price_cents: Math.round(dollars * 100),
          location: form.location.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'failed' }));
        setError(error);
        return;
      }
      const { listing } = await res.json();
      router.push(`/trade/${listing.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name">
          <input
            value={form.seller_name}
            onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
            placeholder="How buyers see you"
            className="input"
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as any })}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Title">
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="IKEA Malm desk + chair"
          className="input"
        />
      </Field>
      <Field label="Description">
        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Condition, pickup details, anything a buyer should know."
          className="input"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Asking price (USD)">
          <input
            required
            type="number"
            min="0"
            step="1"
            value={form.asking_price}
            onChange={(e) => setForm({ ...form, asking_price: e.target.value })}
            placeholder="120"
            className="input"
          />
        </Field>
        <Field label="Location (optional)">
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Morningside Heights, NYC"
            className="input"
          />
        </Field>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-end">
        <button
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Publish listing
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
        }
        .input:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 1px #0f172a;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
