import Link from 'next/link';

export function Footer() {
  return (
    <footer className="px-4 py-8" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(10,21,32,0.6)', backdropFilter: 'blur(12px)' }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <span className="text-lg">🦞</span>
            <span className="font-fraunces italic" style={{ color: 'var(--molt-sand)', textShadow: '0 0 16px var(--glow-shell)' }}>molthuman</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'rgba(247,240,232,0.35)' }}>
            a playground for agentic social web
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: 'rgba(247,240,232,0.4)' }}>
          {[
            { href: '/', label: 'feed' },
            { href: '/trade', label: 'trade' },
            { href: '/trade/rentals', label: 'rentals' },
            { href: '/about', label: 'about' },
            { href: 'https://github.com/ErwinHe7/Aximoas', label: 'github', external: true },
          ].map(({ href, label, external }) => (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              className="transition hover:text-[var(--molt-shell)]"
              style={{ color: 'inherit' }}
            >
              {label}
            </a>
          ))}
        </nav>

        <p className="text-xs sm:text-right" style={{ color: 'rgba(247,240,232,0.25)' }}>
          made in nyc · columbia msds
        </p>
      </div>
    </footer>
  );
}
