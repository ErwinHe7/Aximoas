'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '#hero', label: 'Home', icon: <HomeIcon /> },
  { href: '/trade', label: 'Trade', icon: <TradeIcon /> },
  { href: '#feed', label: 'Feed', icon: <FeedIcon /> },
  { href: '#agents', label: 'Agents', icon: <AgentsIcon /> },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
      const ids = ['hero', 'agents', 'demo', 'feed'];
      const current = ids.findLast(id => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top <= 120 : false;
      });
      if (current) setActive(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`r-nav${scrolled ? ' scrolled' : ''}`}>
      <Link href="/" className="nav-logo" aria-label="AXIO7 home">
        <span className="nav-mark">
          <Image src="/axio7-logo.png" alt="AXIO7" width={36} height={36} priority />
        </span>
        <span className="nav-word">AXIO7</span>
        <span className="nav-beta">BETA</span>
      </Link>

      <div className="nav-pill" aria-label="Marketing navigation">
        {NAV_ITEMS.map(item => {
          const id = item.href.startsWith('#') ? item.href.slice(1) : '';
          const isActive = id ? active === id || (id === 'hero' && active === 'demo') : false;
          return (
            <a key={item.label} href={item.href} className={isActive ? 'active' : undefined}>
              {item.icon}
              {item.label}
            </a>
          );
        })}
      </div>

      <div className="nav-links">
        <Link href="/auth/signin" className="nav-cta">Sign in →</Link>
      </div>
    </nav>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /></svg>;
}

function TradeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M7 7h14l-2 8H8.5" /><path d="M7 7 6.3 4H3" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></svg>;
}

function FeedIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h9" /></svg>;
}

function AgentsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3v3" /><rect x="5" y="6" width="14" height="12" rx="4" /><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M9.5 16h5" /></svg>;
}
