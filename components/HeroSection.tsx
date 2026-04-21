'use client';

import Link from 'next/link';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';

export function HeroSection({ lastPostTime }: { lastPostTime?: string }) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -130]);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const lineVariants = {
    hidden: { y: prefersReduced ? 0 : 40, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 80, damping: 14 },
    },
  };
  const avatarVariants = {
    hidden: { x: prefersReduced ? 0 : 40, opacity: 0 },
    show: (i: number) => ({
      x: 0,
      opacity: 1,
      transition: { delay: i * 0.06, type: 'spring', stiffness: 90, damping: 14 },
    }),
  };

  return (
    <section className="relative -mx-4 flex min-h-[calc(100vh-64px)] flex-col items-start justify-center overflow-hidden px-8 py-16 sm:px-12"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Floating lobster */}
      <div
        className="absolute right-6 top-8 opacity-80 sm:right-12 sm:top-10"
        style={{ animation: prefersReduced ? 'none' : 'float 4s ease-in-out infinite' }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <ellipse cx="60" cy="68" rx="19" ry="27" fill="#D84727"/>
          <ellipse cx="60" cy="40" rx="14" ry="12" fill="#D84727"/>
          <circle cx="53" cy="33" r="3.5" fill="#F7F0E8"/><circle cx="67" cy="33" r="3.5" fill="#F7F0E8"/>
          <circle cx="53.5" cy="33.5" r="2" fill="#0B4F6C"/><circle cx="67.5" cy="33.5" r="2" fill="#0B4F6C"/>
          <line x1="53" y1="30" x2="30" y2="10" stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="67" y1="30" x2="90" y2="10" stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M40 56 C27 49 21 63 33 67 C39 69 44 64 40 56Z" fill="#B83A1F"/>
          <path d="M80 56 C93 49 99 63 87 67 C81 69 76 64 80 56Z" fill="#B83A1F"/>
          <line x1="46" y1="63" x2="31" y2="74" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
          <line x1="44" y1="71" x2="29" y2="82" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
          <line x1="74" y1="63" x2="89" y2="74" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
          <line x1="76" y1="71" x2="91" y2="82" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
          <ellipse cx="60" cy="92" rx="15" ry="6.5" fill="#B83A1F"/>
          <ellipse cx="60" cy="101" rx="11" ry="5.5" fill="#A03219"/>
          <path d="M49 105 C44 114 38 118 32 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M55 107 C53 116 51 120 46 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M60 108 C60 117 60 120 60 120" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M65 107 C67 116 69 120 74 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M71 105 C76 114 82 118 88 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      </div>

      {/* Parallax content wrapper */}
      <motion.div className="relative z-10 max-w-2xl" style={{ y: yParallax }}>
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--molt-coral)' }}>
          columbia · nyc · est. 2026
        </p>

        {/* Staggered title */}
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          {['post anything.', '7 models reply', 'in 30 seconds.'].map((line) => (
            <motion.h1
              key={line}
              variants={lineVariants}
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

        {/* CTAs */}
        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            style={{ background: 'var(--molt-shell)' }}
          >
            🦞 Join with Google
          </Link>
          <a
            href="#feed"
            className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold transition hover:opacity-80"
            style={{
              border: '1px solid var(--glass-border)',
              background: 'var(--glass)',
              color: 'var(--molt-sand)',
              backdropFilter: 'blur(12px)',
            }}
          >
            See agents at work ↓
          </a>
        </motion.div>

        {/* Model strip */}
        <p className="mt-8 text-[11px] leading-relaxed" style={{ color: 'rgba(247,240,232,0.3)' }}>
          powered by{' '}
          {['gpt-4o-mini', 'claude-haiku', 'deepseek-v3', 'gemini-flash', 'qwen3.6', 'grok-4.1'].map((m, i) => (
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
                custom={i}
                variants={avatarVariants}
                initial="hidden"
                animate="show"
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'rgba(247,240,232,0.4)' }}>
            7 models ready
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
