import Link from 'next/link';
import { Home, ShoppingBag, Sparkles, User } from 'lucide-react';

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          Aximoas
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/" icon={<Home className="h-4 w-4" />} label="Feed" />
          <NavLink href="/trade" icon={<ShoppingBag className="h-4 w-4" />} label="Trade" />
          <NavLink href="/profile" icon={<User className="h-4 w-4" />} label="Me" />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-muted transition hover:bg-surface-alt hover:text-ink"
    >
      {icon}
      {label}
    </Link>
  );
}
