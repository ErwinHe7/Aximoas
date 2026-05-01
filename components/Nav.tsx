import Link from 'next/link';
import { Home, ShoppingBag, User, LogIn, LogOut, Info, MessageSquare } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getUnreadMessageCount } from '@/lib/store';
import { BellButton } from './BellButton';

export async function Nav() {
  const user = await getCurrentUser();
  const unreadMessages = user.authenticated
    ? await getUnreadMessageCount(user.id).catch(() => 0)
    : 0;

  return (
    <header
      className="nav-light sticky top-0 z-30 backdrop-blur-xl"
      style={{
        background: 'rgba(247,240,232,0.82)',
        borderBottom: '1px solid var(--lt-border)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="AXIO7" className="h-12 w-auto" />
        </Link>

        <nav className="flex items-center gap-0.5 text-sm">
          <NavLink href="/"        icon={<Home className="h-4 w-4" />}         label="Home"   />
          <NavLink href="/trade"   icon={<ShoppingBag className="h-4 w-4" />}  label="Trade"  />
          <NavLink href="/about"   icon={<Info className="h-4 w-4" />}         label="About"  />
          <NavLink href="/ask"     icon={<span className="text-xs font-bold" style={{ color: 'var(--molt-coral)' }}>Ask</span>} label="Ask" />

          {/* Inbox with unread badge */}
          <Link
            href="/inbox"
            className="nav-item group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          >
            <span className="relative">
              <MessageSquare className="h-4 w-4" />
              {unreadMessages > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: 'var(--molt-coral)' }}
                >
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Inbox</span>
            <span
              className="absolute bottom-0.5 left-1/2 h-px w-4/5 origin-center -translate-x-1/2 scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
              style={{ background: 'var(--molt-shell)' }}
            />
          </Link>

          <NavLink href="/profile" icon={<User className="h-4 w-4" />} label="Profile" />

          <BellButton authenticated={user.authenticated} />

          {user.authenticated ? (
            <UserChip user={user} />
          ) : (
            <Link
              href="/auth/signin"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: 'var(--molt-shell)' }}
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
      className="nav-item group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span
        className="absolute bottom-0.5 left-1/2 h-px w-4/5 origin-center -translate-x-1/2 scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
        style={{ background: 'var(--molt-shell)' }}
      />
    </Link>
  );
}

function UserChip({ user }: { user: { name: string; avatar: string | null } }) {
  return (
    <div
      className="ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1"
      style={{ border: '1px solid var(--lt-border)', background: 'rgba(255,255,255,0.56)' }}
    >
      {user.avatar ? (
        <img src={user.avatar} alt="" className="h-6 w-6 rounded-full" />
      ) : (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: 'var(--molt-shell)' }}
        >
          {(user.name?.[0] ?? 'U').toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:block" style={{ color: 'var(--lt-text)' }}>
        {user.name}
      </span>
      <a
        href="/auth/signout"
        title="Sign out"
        className="rounded p-0.5 opacity-40 transition hover:opacity-100"
        style={{ color: 'var(--lt-muted)' }}
      >
        <LogOut className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
