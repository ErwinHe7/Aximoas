import { Bot, Heart, MessageCircle } from 'lucide-react';
import type { Post, Reply } from '@/lib/types';
import { timeAgo } from '@/lib/format';

export function PostCard({ post, replies }: { post: Post; replies: Reply[] }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <img
          src={post.author_avatar ?? ''}
          alt=""
          className="h-9 w-9 rounded-full bg-slate-100"
        />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{post.author_name}</span>
            <span className="text-xs text-ink-muted">· {timeAgo(post.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {post.content}
          </p>
        </div>
      </header>
      <footer className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" /> {post.like_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> {post.reply_count}
        </span>
      </footer>

      {replies.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {replies.map((r) => (
            <ReplyItem key={r.id} reply={r} />
          ))}
        </div>
      )}
    </article>
  );
}

function ReplyItem({ reply }: { reply: Reply }) {
  const isAgent = reply.author_kind === 'agent';
  return (
    <div className="flex items-start gap-3">
      <div className="relative">
        <img
          src={reply.author_avatar ?? ''}
          alt=""
          className="h-7 w-7 rounded-full bg-slate-100"
        />
        {isAgent && (
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white ring-2 ring-white">
            <Bot className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold text-ink">{reply.author_name}</span>
          {isAgent && (
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              Agent
            </span>
          )}
          <span className="text-ink-muted">· {timeAgo(reply.created_at)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {reply.content}
        </p>
      </div>
    </div>
  );
}
