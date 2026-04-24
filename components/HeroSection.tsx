'use client';

import Link from 'next/link';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';

interface HeroUser { authenticated: boolean; name: string; avatar: string | null; }

export function HeroSection({ lastPostTime, user }: { lastPostTime?: string; user?: HeroUser }) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -80]);
  const yLobster  = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -120]);

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
      {/* ── Right-side visual: lobster illustration + logo watermark ── */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-center overflow-hidden">

        {/* AXIO7 logo — faint watermark behind lobster */}
        <motion.img
          src="/logo.png"
          alt=""
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.10 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="absolute w-[380px] max-w-none select-none sm:w-[460px] lg:w-[540px]"
        />

        {/* Lobster image — gentle float + glow */}
        <motion.img
          src="/lobster.png"
          alt=""
          aria-hidden
          style={{ y: yLobster, filter: 'drop-shadow(0 12px 40px rgba(216,71,39,0.5))' }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={prefersReduced
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, y: [0, -18, 0] }
          }
          transition={prefersReduced
            ? { duration: 0.9, delay: 0.2 }
            : {
                opacity: { duration: 0.9, delay: 0.2 },
                scale:   { duration: 0.9, delay: 0.2 },
                y:       { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 },
              }
          }
          className="select-none w-[260px] sm:w-[300px] lg:w-[340px]"
        />
      </div>

      {/* ── Left-side text content ── */}
      <motion.div className="relative z-10 max-w-xl" style={{ y: yParallax }}>

        {/* AXIO7 logo embedded above headline */}
        <motion.img
          src="/logo.png"
          alt="AXIO7"
          initial={{ opacity: 0, y: prefersReduced ? 0 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-6 h-20 w-auto sm:h-24 lg:h-28"
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

function LobsterIllustration() {
  return (
    <svg width="280" height="320" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        {/* Body gradient — warm orange-red with top highlight */}
        <radialGradient id="lb-body" cx="38%" cy="28%" r="62%">
          <stop offset="0%" stopColor="#FF8060"/>
          <stop offset="45%" stopColor="#E04820"/>
          <stop offset="100%" stopColor="#9A2408"/>
        </radialGradient>
        <radialGradient id="lb-head" cx="38%" cy="28%" r="62%">
          <stop offset="0%" stopColor="#F07050"/>
          <stop offset="50%" stopColor="#D84020"/>
          <stop offset="100%" stopColor="#8B1E08"/>
        </radialGradient>
        <radialGradient id="lb-claw" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#EC6840"/>
          <stop offset="55%" stopColor="#C03818"/>
          <stop offset="100%" stopColor="#781408"/>
        </radialGradient>
        <radialGradient id="lb-tail" cx="50%" cy="20%" r="65%">
          <stop offset="0%" stopColor="#D84828"/>
          <stop offset="100%" stopColor="#8A2008"/>
        </radialGradient>
        <linearGradient id="lb-seg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.08)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)"/>
        </linearGradient>
      </defs>

      {/* ── Long antennae ── */}
      <path d="M80 38 Q55 16 12 4" fill="none" stroke="#F9C0A0" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M120 38 Q145 16 188 4" fill="none" stroke="#F9C0A0" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M82 42 Q64 28 46 22" fill="none" stroke="#FAD0B8" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
      <path d="M118 42 Q136 28 154 22" fill="none" stroke="#FAD0B8" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>

      {/* ── Head/carapace — filled shield shape ── */}
      <path d="M70 34 Q60 28 62 20 Q72 10 100 10 Q128 10 138 20 Q140 28 130 34 Q118 42 100 43 Q82 42 70 34Z" fill="url(#lb-head)"/>
      {/* rostrum spike */}
      <path d="M93 10 L100 1 L107 10Z" fill="#C03818"/>
      {/* carapace sheen */}
      <ellipse cx="88" cy="22" rx="9" ry="6" fill="white" opacity="0.14" transform="rotate(-18 88 22)"/>

      {/* ── Eye stalks + eyes ── */}
      <line x1="76" y1="24" x2="70" y2="16" stroke="#8B1E08" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="69" cy="14" r="5" fill="#F8F0E8"/>
      <circle cx="69.5" cy="14.5" r="2.8" fill="#0B4F6C"/>
      <circle cx="68.5" cy="13.5" r="1" fill="white" opacity="0.6"/>
      <line x1="124" y1="24" x2="130" y2="16" stroke="#8B1E08" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="131" cy="14" r="5" fill="#F8F0E8"/>
      <circle cx="130.5" cy="14.5" r="2.8" fill="#0B4F6C"/>
      <circle cx="129.5" cy="13.5" r="1" fill="white" opacity="0.6"/>

      {/* ── Thorax — segmented body ── */}
      <path d="M68 42 Q65 44 64 50 L64 84 Q68 90 100 91 Q132 90 136 84 L136 50 Q135 44 132 42 Q118 50 100 51 Q82 50 68 42Z" fill="url(#lb-body)"/>
      {/* segment grooves */}
      <path d="M65 56 Q100 60 135 56" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="1.4"/>
      <path d="M65 68 Q100 72 135 68" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="1.4"/>
      <path d="M65 80 Q100 84 135 80" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="1.4"/>
      {/* body sheen */}
      <ellipse cx="84" cy="56" rx="9" ry="16" fill="white" opacity="0.10" transform="rotate(-12 84 56)"/>

      {/* ── LEFT CLAW ── */}
      {/* arm */}
      <path d="M65 54 Q42 56 30 66 Q22 72 18 80" fill="none" stroke="#C03818" strokeWidth="7" strokeLinecap="round"/>
      {/* main claw body */}
      <path d="M4 70 C-4 62 -2 80 4 88 C10 94 24 92 28 82 C32 72 22 58 4 70Z" fill="url(#lb-claw)"/>
      {/* claw highlight */}
      <ellipse cx="12" cy="76" rx="5" ry="8" fill="white" opacity="0.12" transform="rotate(-20 12 76)"/>
      {/* dactyl (movable finger) */}
      <path d="M22 80 C16 70 8 70 6 76" fill="none" stroke="#781408" strokeWidth="3.5" strokeLinecap="round"/>

      {/* ── RIGHT CLAW ── */}
      <path d="M135 54 Q158 56 170 66 Q178 72 182 80" fill="none" stroke="#C03818" strokeWidth="7" strokeLinecap="round"/>
      <path d="M196 70 C204 62 202 80 196 88 C190 94 176 92 172 82 C168 72 178 58 196 70Z" fill="url(#lb-claw)"/>
      <ellipse cx="188" cy="76" rx="5" ry="8" fill="white" opacity="0.12" transform="rotate(20 188 76)"/>
      <path d="M178 80 C184 70 192 70 194 76" fill="none" stroke="#781408" strokeWidth="3.5" strokeLinecap="round"/>

      {/* ── Walking legs — 3 pairs ── */}
      <line x1="72" y1="76" x2="50" y2="96" stroke="#B03010" strokeWidth="3" strokeLinecap="round"/>
      <line x1="74" y1="84" x2="52" y2="106" stroke="#B03010" strokeWidth="3" strokeLinecap="round"/>
      <line x1="76" y1="90" x2="58" y2="114" stroke="#B03010" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="128" y1="76" x2="150" y2="96" stroke="#B03010" strokeWidth="3" strokeLinecap="round"/>
      <line x1="126" y1="84" x2="148" y2="106" stroke="#B03010" strokeWidth="3" strokeLinecap="round"/>
      <line x1="124" y1="90" x2="142" y2="114" stroke="#B03010" strokeWidth="2.5" strokeLinecap="round"/>

      {/* ── Abdomen — curved tapering segments ── */}
      <path d="M68 88 Q65 100 67 112 Q72 130 100 134 Q128 130 133 112 Q135 100 132 88 Q120 94 100 95 Q80 94 68 88Z" fill="url(#lb-body)"/>
      <path d="M68 100 Q100 106 132 100" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.4"/>
      <path d="M69 114 Q100 119 131 114" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.4"/>
      <path d="M71 126 Q100 130 129 126" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2"/>

      {/* ── Fan tail — 5 plates, filled ── */}
      {/* central telson */}
      <path d="M88 132 Q84 150 82 166 Q86 174 100 175 Q114 174 118 166 Q116 150 112 132Z" fill="url(#lb-tail)"/>
      <path d="M94 136 Q92 152 92 164" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap="round"/>
      {/* left uropod 1 */}
      <path d="M84 132 Q74 144 66 160 Q70 168 80 165 Q88 154 88 134Z" fill="#C03818"/>
      {/* left uropod 2 */}
      <path d="M80 130 Q64 138 56 154 Q60 162 70 158 Q78 147 80 130Z" fill="#A02C12"/>
      {/* right uropod 1 */}
      <path d="M116 132 Q126 144 134 160 Q130 168 120 165 Q112 154 112 134Z" fill="#C03818"/>
      {/* right uropod 2 */}
      <path d="M120 130 Q136 138 144 154 Q140 162 130 158 Q122 147 120 130Z" fill="#A02C12"/>
    </svg>
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
