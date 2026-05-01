import Link from 'next/link';
import { MessageSquare, Tag } from 'lucide-react';
import { LightPage } from '@/components/LightPage';
import { getCurrentUser } from '@/lib/auth';
import { listTransactionsByUser } from '@/lib/store';
import { formatCents, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const user = await getCurrentUser();

  if (!user.authenticated) {
    return (
      <LightPage>
        <div className="py-20 text-center space-y-4">
          <MessageSquare className="mx-auto h-10 w-10 opacity-20" style={{ color: 'var(--lt-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--lt-muted)' }}>Sign in to see your trade conversations.</p>
          <Link
            href="/auth/signin?next=/inbox"
            className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--molt-shell)' }}
          >
            Sign in with Google
          </Link>
        </div>
      </LightPage>
    );
  }

  const conversations = await listTransactionsByUser(user.id).catch(() => []);

  return (
    <LightPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between pt-2">
          <h1
            className="font-fraunces text-5xl font-black italic leading-none sm:text-6xl"
            style={{
              background: 'linear-gradient(135deg, var(--molt-shell) 0%, var(--molt-coral) 48%, var(--lt-text) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Inbox
          </h1>
          <Link
            href="/trade"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--molt-shell)' }}
          >
            Browse Trade
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div
            className="rounded-[22px] border-dashed p-16 text-center"
            style={{ border: '1px dashed var(--lt-border)', background: 'var(--lt-surface)' }}
          >
            <MessageSquare className="mx-auto h-8 w-8 mb-3 opacity-20" style={{ color: 'var(--lt-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--lt-text)' }}>No active trades yet.</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--lt-muted)' }}>
              When you connect with a buyer or seller, your conversation will appear here.
            </p>
            <Link
              href="/trade"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--molt-shell)' }}
            >
              Browse Trade Board →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations.map((tx) => {
              const isSeller = tx.seller_id === user.id;
              const otherName = isSeller ? tx.buyer_name : tx.seller_name;
              const threadUrl = `/trade/${tx.listing_id}/thread?tx=${tx.id}`;
              const hasUnread = tx.unread_count > 0;

              return (
                <li key={tx.id}>
                  <Link
                    href={threadUrl}
                    className="flex items-start gap-3 rounded-[18px] px-4 py-3.5 transition hover:opacity-90"
                    style={{
                      background: hasUnread ? 'rgba(216,71,39,0.06)' : 'var(--lt-surface)',
                      border: `1px solid ${hasUnread ? 'rgba(216,71,39,0.2)' : 'var(--lt-border)'}`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: 'var(--molt-shell)' }}
                    >
                      {otherName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--lt-text)' }}>
                          {otherName}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasUnread && (
                            <span
                              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                              style={{ background: 'var(--molt-coral)' }}
                            >
                              {tx.unread_count}
                            </span>
                          )}
                          {tx.last_message_at && (
                            <span className="text-[11px]" style={{ color: 'var(--lt-subtle)' }}>
                              {timeAgo(tx.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--lt-muted)' }}>
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 capitalize"
                          style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--lt-subtle)' }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tx.listing_category}
                        </span>
                        <span className="truncate font-medium" style={{ color: 'var(--lt-text)' }}>
                          {tx.listing_title}
                        </span>
                        <span className="flex-shrink-0">· {formatCents(tx.amount_cents, 'USD')}</span>
                      </div>

                      {tx.last_message && (
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--lt-muted)' }}>
                          {tx.last_message}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LightPage>
  );
}
