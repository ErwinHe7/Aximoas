'use client';

import Link from 'next/link';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';

interface HeroUser { authenticated: boolean; name: string; avatar: string | null; }

export function HeroSection({ lastPostTime, user }: { lastPostTime?: string; user?: HeroUser }) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -80]);
  const yLogo    = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -40]);
  const yLobster = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -120]);

  const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
  const lineVariants = {
    hidden: { y: prefersReduced ? 0 : 40, opacity: prefersReduced ? 1 : 0 },
    show:   { y: 0, opacity: 1 },
  };
  const avatarVariants = {
    hidden: { x: prefersReduced ? 0 : 40, opacity: prefersReduced ? 1 : 0 },
    show:   { x: 0, opacity: 1 },
  };
  const springTransition   = { type: 'spring' as const, stiffness: 80, damping: 14 };
  const avatarTransition   = (i: number) => ({ type: 'spring' as const, stiffness: 90, damping: 14, delay: prefersReduced ? 0 : i * 0.06 });

  return (
    <section
      className="relative -mx-4 flex min-h-[calc(100vh-64px)] flex-col items-start justify-center overflow-hidden px-8 py-16 sm:px-12"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* ── Right-side visual: big logo + 3-D lobster ── */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-center overflow-hidden">

        {/* Large logo — faint watermark behind lobster */}
        <motion.img
          src="/logo.png"
          alt=""
          aria-hidden
          style={{ y: yLogo }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: prefersReduced ? 0.08 : 0.13, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute w-[420px] max-w-none select-none sm:w-[520px] lg:w-[600px]"
        />

        {/* 3-D lobster — spins, floats, glows */}
        <motion.div
          style={{ y: yLobster }}
          initial={{ opacity: 0, rotateY: -30 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        >
          <motion.div
            animate={prefersReduced ? {} : {
              y:       [0, -18, 0],
              rotateZ: [-2, 2, -2],
              rotateX: [3, -3, 3],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ perspective: 800, transformStyle: 'preserve-3d', filter: 'drop-shadow(0 0 40px rgba(216,71,39,0.55)) drop-shadow(0 20px 40px rgba(11,79,108,0.4))' }}
          >
            <svg width="260" height="260" viewBox="0 0 120 120" fill="none" aria-hidden="true"
              style={{ filter: 'drop-shadow(0 4px 24px rgba(216,71,39,0.6))' }}>
              {/* body */}
              <ellipse cx="60" cy="68" rx="19" ry="27" fill="url(#bodyGrad)"/>
              {/* head */}
              <ellipse cx="60" cy="40" rx="14" ry="12" fill="url(#headGrad)"/>
              {/* eyes */}
              <circle cx="53" cy="33" r="3.5" fill="#F7F0E8"/>
              <circle cx="67" cy="33" r="3.5" fill="#F7F0E8"/>
              <circle cx="53.5" cy="33.5" r="2" fill="#0B4F6C"/>
              <circle cx="67.5" cy="33.5" r="2" fill="#0B4F6C"/>
              {/* antennae */}
              <line x1="53" y1="30" x2="28" y2="8"  stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="67" y1="30" x2="92" y2="8"  stroke="#F9B5A4" strokeWidth="2.5" strokeLinecap="round"/>
              {/* claws */}
              <path d="M40 56 C27 49 21 63 33 67 C39 69 44 64 40 56Z" fill="url(#clawGrad)"/>
              <path d="M80 56 C93 49 99 63 87 67 C81 69 76 64 80 56Z" fill="url(#clawGrad)"/>
              {/* legs */}
              <line x1="46" y1="63" x2="30" y2="76" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
              <line x1="44" y1="72" x2="28" y2="84" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
              <line x1="74" y1="63" x2="90" y2="76" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
              <line x1="76" y1="72" x2="92" y2="84" stroke="#B83A1F" strokeWidth="3" strokeLinecap="round"/>
              {/* tail */}
              <ellipse cx="60" cy="92" rx="15" ry="6.5" fill="#B83A1F"/>
              <ellipse cx="60" cy="101" rx="11" ry="5.5" fill="#A03219"/>
              <path d="M49 105 C44 114 38 118 32 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M55 107 C53 116 51 120 46 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M60 108 C60 117 60 120 60 120" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M65 107 C67 116 69 120 74 119" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M71 105 C76 114 82 118 88 116" stroke="#B83A1F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              {/* sheen / specular highlight */}
              <ellipse cx="55" cy="52" rx="5" ry="9" fill="white" opacity="0.12" transform="rotate(-15 55 52)"/>
              <defs>
                <radialGradient id="bodyGrad" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FF6B4A"/>
                  <stop offset="100%" stopColor="#B83A1F"/>
                </radialGradient>
                <radialGradient id="headGrad" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#E85535"/>
                  <stop offset="100%" stopColor="#A03219"/>
                </radialGradient>
                <linearGradient id="clawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D84727"/>
                  <stop offset="100%" stopColor="#8B2A12"/>
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Left-side text content ── */}
      <motion.div className="relative z-10 max-w-xl" style={{ y: yParallax }}>

        {/* Big logo at top of text block */}
        <motion.img
          src="/logo.png"
          alt="AXIO7"
          initial={{ opacity: 0, y: prefersReduced ? 0 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-6 h-16 w-auto sm:h-20 lg:h-24"
        />

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

        {/* CTAs */}
        <motion.div
          className="mt-8 flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {user?.authenticated ? (
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex items-center gap-2.5 rounded-[22px] px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/30" />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--molt-shell)' }}>
                    {user.name[0]?.toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: 'var(--molt-sand)' }}>{user.name}</span>
              </div>
              <a href="#feed" className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95" style={{ background: 'var(--molt-shell)' }}>
                Start posting ↓
              </a>
            </div>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 rounded-[22px] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
                style={{ background: 'var(--molt-shell)' }}
              >
                <GoogleIcon />
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

        {/* Agent avatars */}
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
          <span className="text-xs" style={{ color: 'rgba(247,240,232,0.4)' }}>7 agents ready</span>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-xs" style={{ color: 'rgba(247,240,232,0.25)' }}>
        <span>scroll</span>
        <span className="text-lg">↓</span>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.7 26.7 36 24 36c-5.3 0-9.7-3.5-11.3-8.4l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.8l6.2 5.2C40 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
