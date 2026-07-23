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

const infoBox: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 14,
  marginBottom: 20,
  fontSize: 12.5,
  color: 'var(--text-muted)',
  lineHeight: 1.5,
};

export default function PanicPasswordPage() {
  const router = useRouter();
  const [hasPanic, setHasPanic] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [newPanicPassword, setNewPanicPassword] = useState('');
  const [confirmPanicPassword, setConfirmPanicPassword] = useState('');
  const [removePassword, setRemovePassword] = useState('');
  const [showRemove, setShowRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requireAuth(router)) return;
    api('/settings/profile')
      .then((data) => setHasPanic(data.hasPanicPassword))
      .catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPanicPassword.length < 8) {
      setError('Panic password must be at least 8 characters');
      return;
    }
    if (newPanicPassword !== confirmPanicPassword) {
      setError('Panic passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api('/settings/panic-password', {
        method: 'POST',
        body: JSON.stringify({ password, newPanicPassword }),
      });
      setSuccess('Panic password saved.');
      setHasPanic(true);
      setPassword('');
      setNewPanicPassword('');
      setConfirmPanicPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await fetch(`${API_BASE}/settings/panic-password`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: removePassword }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
      });
      setSuccess('Panic password removed.');
      setHasPanic(false);
      setShowRemove(false);
      setRemovePassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 460, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '8px 0 14px' }}>Panic password</h1>

      <div style={infoBox}>
        A panic password is a second password you can enter instead of your real one if you're ever
        forced to log in under duress. Logging in with it looks completely normal — but your balances
        will show as zero, keeping your real funds hidden from view. It must be different from your
        real password.
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {success && <p style={{ color: '#34c471', fontSize: 13, marginBottom: 12 }}>{success}</p>}

      <form onSubmit={submit}>
        <label style={labelStyle}>
          Account password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          {hasPanic ? 'New panic password' : 'Panic password'}
          <input
            type="password"
            value={newPanicPassword}
            onChange={(e) => setNewPanicPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Confirm {hasPanic ? 'new panic password' : 'panic password'}
          <input
            type="password"
            value={confirmPanicPassword}
            onChange={(e) => setConfirmPanicPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : hasPanic ? 'Update panic password' : 'Set panic password'}
        </button>
      </form>

      {hasPanic && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {!showRemove ? (
            <button
              onClick={() => setShowRemove(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              Remove panic password
            </button>
          ) : (
            <form onSubmit={remove}>
              <label style={labelStyle}>
                Confirm your account password to remove it
                <input
                  type="password"
                  value={removePassword}
                  onChange={(e) => setRemovePassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{ ...primaryButton, background: 'var(--danger)', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Removing…' : 'Confirm removal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemove(false)}
                  style={{ height: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', padding: '0 16px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
