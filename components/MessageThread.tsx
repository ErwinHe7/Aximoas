'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import type { Message } from '@/lib/types';
import { timeAgo } from '@/lib/format';

export function MessageThread({
  transactionId,
  currentUserId,
  currentUserName,
  sellerName,
  buyerName,
  initialMessages,
}: {
  transactionId: string;
  currentUserId: string;
  currentUserName: string;
  sellerName: string;
  buyerName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Poll every 4s
  useEffect(() => {
    const iv = setInterval(async () => {
      const res = await fetch(`/api/transactions/${transactionId}/messages`).catch(() => null);
      if (!res?.ok) return;
      const { messages: next } = await res.json();
      if (Array.isArray(next)) setMessages(next);
    }, 4000);
    return () => clearInterval(iv);
  }, [transactionId]);

  async function send() {
    if (!content.trim() || submitting) return;
    const body = content.trim();
    setContent('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_name: currentUserName, content: body }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) => [...prev, message]);
      } else {
        setContent(body); // restore on error
      }
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[22px]"
      style={{ background: 'var(--lt-surface)', border: '1px solid var(--lt-border)', minHeight: 480 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-xs"
        style={{ borderBottom: '1px solid var(--lt-border)', color: 'var(--lt-muted)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: '#4A7C59' }}
          />
          <span>
            <span className="font-medium" style={{ color: 'var(--lt-text)' }}>{sellerName}</span>
            {' '}×{' '}
            <span className="font-medium" style={{ color: 'var(--lt-text)' }}>{buyerName}</span>
          </span>
        </div>
        <span>{messages.filter((m) => m.sender_id !== 'system').length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '55vh', minHeight: 240 }}>
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--lt-muted)' }}>
            Say hi to get started.
          </p>
        )}
        {messages.map((m) => {
          const isSystem = m.sender_id === 'system';
          const isMine = !isSystem && m.sender_id === currentUserId;

          if (isSystem) {
            return (
              <div key={m.id} className="flex justify-center">
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-center text-xs"
                  style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--lt-subtle)' }}
                >
                  {m.content}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div
                className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: isMine ? 'var(--molt-shell)' : 'var(--lt-subtle)' }}
              >
                {m.sender_name.slice(0, 1).toUpperCase()}
              </div>

              <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMine ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--lt-subtle)' }}>
                  {!isMine && <span className="font-medium" style={{ color: 'var(--lt-muted)' }}>{m.sender_name}</span>}
                  <span>{timeAgo(m.created_at)}</span>
                </div>
                <div
                  className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={isMine ? {
                    background: 'var(--molt-shell)',
                    color: 'white',
                    borderBottomRightRadius: 4,
                  } : {
                    background: 'rgba(0,0,0,0.06)',
                    color: 'var(--lt-text)',
                    borderBottomLeftRadius: 4,
                  }}
                >
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--lt-border)' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid var(--lt-border)',
              color: 'var(--lt-text)',
              caretColor: 'var(--molt-shell)',
            }}
          />
          <button
            onClick={send}
            disabled={!content.trim() || submitting}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--molt-shell)' }}
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
