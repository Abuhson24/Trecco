'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  imageUrl: string | null;
  preferredLanguage: string;
  hasTransactionPin: boolean;
  hasPanicPassword: boolean;
}

async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? getToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '16px 18px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  marginBottom: 10,
  textDecoration: 'none',
  cursor: 'pointer',
};

const rowTitle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 };
const rowSubtitle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' };
const chevron: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 16 };
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  margin: '24px 4px 8px',
};

function Row({ href, title, subtitle, danger }: { href: string; title: string; subtitle: string; danger?: boolean }) {
  return (
    <a href={href} style={{ ...row, borderColor: danger ? 'var(--danger)' : 'var(--border)' }}>
      <div>
        <p style={{ ...rowTitle, color: danger ? 'var(--danger)' : 'var(--text)' }}>{title}</p>
        <p style={rowSubtitle}>{subtitle}</p>
      </div>
      <span style={chevron}>›</span>
    </a>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth(router)) return;
    api('/settings/profile')
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Manage your profile, security, and account.
      </p>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      <p style={sectionLabel}>Profile</p>
      <Row
        href="/settings/profile"
        title="Profile"
        subtitle={profile ? `${profile.fullName} · ${profile.email}` : 'Loading…'}
      />
      <Row
        href="/settings/language"
        title="Language"
        subtitle={profile ? profile.preferredLanguage : 'Loading…'}
      />

      <p style={sectionLabel}>Security</p>
      <Row href="/settings/change-password" title="Change password" subtitle="Update your login password" />
      <Row
        href="/settings/transaction-pin"
        title="Transaction PIN"
        subtitle={profile?.hasTransactionPin ? 'PIN set — tap to change' : 'Not set — required for withdrawals and transfers'}
      />
      <Row
        href="/settings/panic-password"
        title="Panic password"
        subtitle={profile?.hasPanicPassword ? 'Set — tap to manage' : 'Set up a duress password for emergencies'}
      />

      <p style={sectionLabel}>Help</p>
      <Row href="/support" title="Customer support" subtitle="WhatsApp, email, or call us" />

      <p style={sectionLabel}>Danger zone</p>
      <Row href="/settings/delete-account" title="Delete account" subtitle="Permanently deactivate your account" danger />
    </main>
  );
}
