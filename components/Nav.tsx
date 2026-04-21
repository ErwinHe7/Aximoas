import Link from 'next/link';
import { Home, ShoppingBag, User, LogIn, LogOut, Info } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(11,79,108,0.12)] bg-[var(--molt-sand)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5 text-[1.1rem] font-semibold tracking-tight">
          <span className="text-xl leading-none">🦞</span>
          <span className="font-fraunces italic text-[var(--molt-ocean)]">molthuman</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/"        icon={<Home className="h-4 w-4" />}        label="Feed"    />
          <NavLink href="/trade"   icon={<ShoppingBag className="h-4 w-4" />} label="Trade"   />
          <NavLink href="/about"   icon={<Info className="h-4 w-4" />}        label="About"   />
          <NavLink href="/profile" icon={<User className="h-4 w-4" />}        label="Profile" />

          {user.authenticated ? (
            <UserChip user={user} />
          ) : (
            <Link
              href="/auth/signin"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--molt-shell)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[var(--molt-ocean)] opacity-70 transition hover:bg-[var(--molt-coral)]/30 hover:opacity-100"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function UserChip({ user }: { user: { name: string; avatar: string | null } }) {
  return (
    <div className="ml-1 flex items-center gap-1.5 rounded-lg border border-[rgba(11,79,108,0.2)] bg-white/60 px-2 py-1">
      {user.avatar ? (
        <img src={user.avatar} alt="" className="h-6 w-6 rounded-full" />
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--molt-shell)] text-[11px] font-bold text-white">
          {(user.name?.[0] ?? 'U').toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:block text-[var(--molt-ocean)]">
        {user.name}
      </span>
      <a href="/auth/signout" title="Sign out" className="rounded p-0.5 opacity-50 transition hover:opacity-100">
        <LogOut className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
