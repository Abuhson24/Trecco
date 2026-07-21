'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getRole, clearSession } from '../lib/auth';
import { useTheme } from '../lib/theme';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/loans', label: 'Loans' },
  { href: '/cards', label: 'Cards' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/inventory', label: 'Inventory' },
];

const COMMITTEE_LINK = { href: '/admin/loans', label: 'Committee' };

const ADMIN_LINKS = [
  { href: '/admin/members', label: 'Admin - Members' },
  { href: '/admin/cards', label: 'Admin - Cards' },
  { href: '/admin/inventory', label: 'Admin - Inventory' },
  { href: '/admin/marketplace', label: 'Admin - Marketplace' },
  { href: '/admin/loans', label: 'Admin - Loans' },
  { href: '/admin/settings', label: 'Admin - Settings' },
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
  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : [...LINKS, COMMITTEE_LINK];

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
        <img src="/logo-icon.png" alt="Trecco" width={22} height={22} style={{ borderRadius: 6 }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Trecco</span>
      </div>
      {links.map((link) => (
        <a
        
          key={link.href}
          href={link.href}
          style={{
            fontSize: 13,
            textDecoration: 'none',
            color: pathname === link.href ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: pathname === link.href ? 500 : 400,
          }}
        >
          {link.label}
        </a>
      ))}
      <button
        onClick={toggle}
        title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 14,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        {mode === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        onClick={logout}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </nav>
  );
}
