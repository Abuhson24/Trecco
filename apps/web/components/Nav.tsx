'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getRole, clearSession } from '../lib/auth';
import { useTheme } from '../lib/theme';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/wallet', label: 'Wallet', icon: '◈' },
  { href: '/loans', label: 'Loans', icon: '◎' },
  { href: '/cards', label: 'Cards', icon: '▭' },
  { href: '/marketplace', label: 'Marketplace', icon: '⇄' },
  { href: '/inventory', label: 'Inventory', icon: '▤' },
  { href: '/bills', label: 'Airtime/Data', icon: '☎' },
];

const SETTINGS_LINKS = [
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/support', label: 'Support', icon: '☎' },
];

const COMMITTEE_LINK = { href: '/admin/loans', label: 'Committee', icon: '✓' };

const ADMIN_LINKS = [
  { href: '/admin/members', label: 'Members', icon: '◍' },
  { href: '/admin/cards', label: 'Cards', icon: '▭' },
  { href: '/admin/inventory', label: 'Inventory', icon: '▤' },
  { href: '/admin/marketplace', label: 'Marketplace', icon: '⇄' },
  { href: '/admin/loans', label: 'Loans', icon: '◎' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setHasToken(!!getToken());
    setRole(getRole());
  }, [pathname]);

  if (!mounted || pathname === '/login' || !hasToken) return null;

  const isAdmin = role === 'COOP_ADMIN' || role === 'TREMMA_SUPER_ADMIN';

  function logout() {
    clearSession();
    router.push('/login');
  }

  function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    const active = pathname === href;
    return (
      <a
        href={href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 13.5,
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--text)' : 'var(--text-muted)',
          background: active ? 'var(--surface-raised)' : 'transparent',
        }}
      >
        <span style={{ width: 18, textAlign: 'center', fontSize: 14, opacity: active ? 1 : 0.7 }}>{icon}</span>
        {label}
      </a>
    );
  }

  return (
    <nav
      style={{
        width: 232,
        minWidth: 232,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '20px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px', marginBottom: 28 }}>
        <img src="/logo-icon.png" alt="Trecco" width={26} height={26} style={{ borderRadius: 7 }} />
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Trecco</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LINKS.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
        {!isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 8px' }} />
            <NavLink {...COMMITTEE_LINK} />
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', margin: '20px 14px 6px' }}>
            Admin
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ADMIN_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        {SETTINGS_LINKS.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
        <button
          onClick={toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span>{mode === 'dark' ? '☀️' : '🌙'}</span>
          {mode === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
