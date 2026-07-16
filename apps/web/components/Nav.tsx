'use client';
// Simple top nav, shown on every page except /login. Hides itself if
// there's no token.
//
// Important: getToken()/getRole() read localStorage, which doesn't exist
// during server-side rendering. Reading them directly in the render body
// causes a hydration mismatch (server renders nothing, client renders the
// nav, React sees they don't match). Fix: only read localStorage inside
// useEffect (client-only), store the result in state, and render nothing
// until that's happened — so server and first client render both agree
// on "nothing," and the real nav appears a beat later once mounted.
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getRole, clearSession } from '../lib/auth';

const LINKS = [
  { href: '/wallet', label: 'Wallet' },
  { href: '/loans', label: 'Loans' },
  { href: '/cards', label: 'Cards' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/inventory', label: 'Inventory' },
];

// Visible to every member, not just admins -- the backend lets any member
// with isCommitteeMember=true vote on loans regardless of role. The page
// itself lives at /admin/loans (shared with the admin loan-management UI)
// and degrades gracefully for non-admins -- see loadAll() in that page.
const COMMITTEE_LINK = { href: '/admin/loans', label: 'Committee' };

const ADMIN_LINKS = [
  { href: '/admin/cards', label: 'Admin - Cards' },
  { href: '/admin/inventory', label: 'Admin - Inventory' },
  { href: '/admin/marketplace', label: 'Admin - Marketplace' },
  { href: '/admin/loans', label: 'Admin - Loans' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setHasToken(!!getToken());
    setRole(getRole());
  }, [pathname]); // re-check on route change too, e.g. right after login sets the token

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
        borderBottom: '1px solid #2a2a2e',
        background: '#0b0b0d',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#8a1414' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>Trecco</span>
      </div>

      {links.map((link) => (
        <a
        
          key={link.href}
          href={link.href}
          style={{
            fontSize: 13,
            textDecoration: 'none',
            color: pathname === link.href ? '#fff' : '#9a9a9f',
            fontWeight: pathname === link.href ? 500 : 400,
          }}
        >
          {link.label}
        </a>
      ))}

      <button
        onClick={logout}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: '1px solid #2a2a2e',
          color: '#9a9a9f',
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
