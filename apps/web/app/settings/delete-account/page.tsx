'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireAuth, clearSession } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  padding: '0 12px',
  boxSizing: 'border-box',
  marginTop: 4,
  fontSize: 14,
};

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 14 };

const dangerButton: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: 'none',
  background: 'var(--danger)',
  color: '#fff',
  fontWeight: 500,
  fontSize: 14,
  padding: '0 20px',
  cursor: 'pointer',
};

const warningBox: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--danger)',
  borderRadius: 10,
  padding: 14,
  marginBottom: 20,
  fontSize: 12.5,
  color: 'var(--text)',
  lineHeight: 1.5,
};

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requireAuth(router);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);

      clearSession();
      router.push('/login');
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--danger)', margin: '8px 0 14px' }}>Delete account</h1>

      <div style={warningBox}>
        This deactivates your Trecco account and signs you out everywhere. Your loan history, transactions,
        and cooperative records are kept for the cooperative's records, but you will no longer be able to log
        in. This cannot be undone from your side — contact support if you need it reversed.
      </div>

      <form onSubmit={submit}>
        <label style={labelStyle}>
          Account password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Type <strong style={{ color: 'var(--text)' }}>DELETE</strong> to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required style={inputStyle} />
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={saving} style={{ ...dangerButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Deleting…' : 'Permanently delete my account'}
        </button>
      </form>
    </main>
  );
}
