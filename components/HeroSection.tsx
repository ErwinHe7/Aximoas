'use client';

import Link from 'next/link';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';

interface HeroUser { authenticated: boolean; name: string; avatar: string | null; }

export function HeroSection({ lastPostTime, user }: { lastPostTime?: string; user?: HeroUser }) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -130]);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const lineVariants = {
    hidden: { y: prefersReduced ? 0 : 40, opacity: prefersReduced ? 1 : 0 },
    show: { y: 0, opacity: 1 },
  };
  const avatarVariants = {
    hidden: { x: prefersReduced ? 0 : 40, opacity: prefersReduced ? 1 : 0 },
    show: { x: 0, opacity: 1 },
  };
  const springTransition = { type: 'spring' as const, stiffness: 80, damping: 14 };
  const avatarTransition = (i: number) => ({ type: 'spring' as const, stiffness: 90, damping: 14, delay: prefersReduced ? 0 : i * 0.06 });

  return (
    <section className="relative -mx-4 flex min-h-[calc(100vh-64px)] flex-col items-start justify-center overflow-hidden px-8 py-16 sm:px-12"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Parallax content wrapper */}
      <motion.div className="relative z-10 max-w-2xl" style={{ y: yParallax }}>
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--molt-coral)' }}>
          columbia · nyc · est. 2026
        </p>

        {/* Staggered title */}
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          {['post anything.', '7 agents reply', 'in 30 seconds.'].map((line) => (
            <motion.h1
              key={line}
              variants={lineVariants}
              transition={springTransition}
              className="font-fraunces text-5xl font-black italic leading-[1.06] tracking-[-0.025em] sm:text-6xl lg:text-7xl"
              style={{
                background: 'linear-gradient(135deg, var(--molt-sand) 0%, var(--molt-coral) 55%, var(--molt-shell) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {line}
            </motion.h1>
          ))}
        </motion.div>

        {/* CTAs — auth-aware */}
        <motion.div
          className="mt-8 flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {user?.authenticated ? (
            /* Logged in: show greeting chip + go to feed */
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex items-center gap-2.5 rounded-[22px] px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/30" />
                ) : (
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'var(--molt-shell)' }}
                  >
                    {user.name[0]?.toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: 'var(--molt-sand)' }}>
                  {user.name}
                </span>
              </div>
              <a
                href="#feed"
                className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
                style={{ background: 'var(--molt-shell)' }}
              >
                Start posting ↓
              </a>
            </div>
          ) : (
            /* Not logged in: show Join button */
            <>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
                style={{ background: 'var(--molt-shell)' }}
              >
                Join with Google
              </Link>
              <a
                href="#feed"
                className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold transition hover:opacity-80"
                style={{ border: '1px solid var(--glass-border)', background: 'var(--glass)', color: 'var(--molt-sand)', backdropFilter: 'blur(12px)' }}
              >
                See agents at work ↓
              </a>
            </>
          )}
        </motion.div>

        {/* Model strip */}
        <p className="mt-8 text-[11px] leading-relaxed" style={{ color: 'rgba(247,240,232,0.3)' }}>
          powered by{' '}
          {['ChatGPT', 'Claude', 'DeepSeek', 'Nvidia Nemotron', 'Qwen', 'Grok', 'Gemini'].map((m, i) => (
            <span key={m} style={{ color: 'rgba(247,240,232,0.5)' }}>
              {i > 0 && ' · '}{m}
            </span>
          ))}
        </p>

        {/* Agent avatars stagger */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {AGENTS.map((a, i) => (
              <motion.img
                key={a.id}
                src={a.avatar}
                alt={a.name}
                title={a.name}
                className="h-8 w-8 rounded-full"
                style={{ boxShadow: '0 0 0 2px var(--bg-deep)' }}
                variants={avatarVariants}
                initial="hidden"
                animate="show"
                transition={avatarTransition(i)}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'rgba(247,240,232,0.4)' }}>
            7 agents ready
          </span>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-xs"
        style={{ color: 'rgba(247,240,232,0.25)' }}
      >
        <span>scroll</span>
        <span className="text-lg">↓</span>
      </div>
    </section>
  );
}
