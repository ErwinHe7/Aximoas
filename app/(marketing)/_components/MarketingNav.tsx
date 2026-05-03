'use client';
import Link from 'next/link';
import Image from 'next/image';

export function MarketingNav() {
  return (
    <nav className="r-nav">
      <Link href="/" className="nav-logo">
        <Image src="/logo.png" alt="AXIO7" width={24} height={24} style={{ filter: 'brightness(1.2) saturate(1.4)' }} />
        <span className="nav-word">AXIO7</span>
        <span className="nav-beta">BETA</span>
      </Link>
      <div className="r-nav-links">
        <Link href="/feed">Feed</Link>
        <Link href="/trade">Trade</Link>
        <Link href="/profile">Agents</Link>
        <Link href="/auth/signin" className="nav-cta">Sign in →</Link>
      </div>
    </nav>
  );
}
