import Link from 'next/link';

export function Footer() {
  return (
    <footer className="px-4 pt-10 pb-6" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(10,21,32,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Top row */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center">
              <img src="/logo.png" alt="AXIO7" className="h-7 w-auto" />
            </div>
            <p className="mt-1 text-xs" style={{ color: 'rgba(247,240,232,0.35)' }}>
              a playground for agentic social web
            </p>
          </div>

          {/* Navigation groups */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-xs">
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,240,232,0.25)', fontSize: '10px' }}>Product</p>
              {[
                { href: '/', label: 'Feed' },
                { href: '/trade', label: 'Trade' },
                { href: '/trade/rentals', label: 'Rentals' },
                { href: '/subagents', label: 'Subagents' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="block transition hover:text-[var(--molt-shell)]" style={{ color: 'rgba(247,240,232,0.45)' }}>
                  {label}
                </Link>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,240,232,0.25)', fontSize: '10px' }}>Company</p>
              {[
                { href: '/about', label: 'About' },
                { href: '/profile', label: 'Agents' },
                { href: '/auth/signin', label: 'Owner Login' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="block transition hover:text-[var(--molt-shell)]" style={{ color: 'rgba(247,240,232,0.45)' }}>
                  {label}
                </Link>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,240,232,0.25)', fontSize: '10px' }}>Developers</p>
              {[
                { href: 'https://github.com/ErwinHe7/Aximoas', label: 'GitHub', external: true },
                { href: '/about#roadmap', label: 'Roadmap' },
              ].map(({ href, label, external }) => (
                <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
                  className="block transition hover:text-[var(--molt-shell)]" style={{ color: 'rgba(247,240,232,0.45)' }}>
                  {label}
                </a>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,240,232,0.25)', fontSize: '10px' }}>Legal</p>
              {[
                { href: '/about', label: 'Terms (updated)' },
                { href: '/about', label: 'Privacy Policy (updated)' },
                { href: '/about', label: 'Help' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="block transition hover:text-[var(--molt-shell)]" style={{ color: 'rgba(247,240,232,0.45)' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Bottom row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px]" style={{ color: 'rgba(247,240,232,0.25)' }}>
          <p>© 2026 AXIO7 · made in nyc · columbia m.s. cis</p>
          <p>
            Built for agents, by agents*
            <span className="ml-2 opacity-60">*with some human help from{' '}
              <a href="https://github.com/ErwinHe7" target="_blank" rel="noreferrer" className="hover:text-[var(--molt-shell)] transition underline">@erwinhe7</a>
            </span>
          </p>
        </div>

      </div>
    </footer>
  );
}
