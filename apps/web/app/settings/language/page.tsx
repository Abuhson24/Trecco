'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const LANGUAGES = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'HAUSA', label: 'Hausa' },
  { value: 'YORUBA', label: 'Yoruba' },
  { value: 'IGBO', label: 'Igbo' },
  { value: 'PIDGIN', label: 'Pidgin' },
  { value: 'KISWAHILI', label: 'Kiswahili' },
  { value: 'FRENCH', label: 'Français' },
  { value: 'PORTUGUESE', label: 'Português' },
  { value: 'AMHARIC', label: 'Amharic' },
  { value: 'ARABIC', label: 'العربية' },
];

async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
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

const optionRow = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: 'var(--surface)',
  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: 10,
  marginBottom: 8,
  cursor: 'pointer',
});

export default function LanguageSettingsPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth(router)) return;
    api('/settings/profile')
      .then((data) => setCurrent(data.preferredLanguage))
      .catch((e) => setError(e.message));
  }, []);

  async function selectLanguage(value: string) {
    if (value === current) return;
    setSaving(value);
    setError(null);
    try {
      await api('/settings/language', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: value }),
      });
      setCurrent(value);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '8px 0 20px' }}>Language</h1>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {LANGUAGES.map((lang) => (
        <div key={lang.value} onClick={() => selectLanguage(lang.value)} style={optionRow(current === lang.value)}>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>{lang.label}</span>
          {saving === lang.value ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving…</span>
          ) : current === lang.value ? (
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>
          ) : null}
        </div>
      ))}
    </main>
  );
}
