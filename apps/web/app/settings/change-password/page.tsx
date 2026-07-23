'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

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

const primaryButton: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 500,
  fontSize: 14,
  padding: '0 20px',
  cursor: 'pointer',
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requireAuth(router);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api('/settings/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '8px 0 20px' }}>Change password</h1>

      <form onSubmit={submit}>
        <label style={labelStyle}>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: '#34c471', fontSize: 13, marginBottom: 12 }}>Password updated successfully.</p>}

        <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
