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
  letterSpacing: 2,
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

export default function TransactionPinPage() {
  const router = useRouter();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requireAuth(router)) return;
    api('/settings/profile')
      .then((data) => setHasPin(data.hasTransactionPin))
      .catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!/^\d{4,6}$/.test(newPin)) {
      setError('PIN must be 4-6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setSaving(true);
    try {
      await api('/settings/transaction-pin', {
        method: 'POST',
        body: JSON.stringify({ password, newPin }),
      });
      setSuccess(true);
      setHasPin(true);
      setPassword('');
      setNewPin('');
      setConfirmPin('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>Transaction PIN</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        {hasPin
          ? 'Your PIN is required to authorize withdrawals and transfers. Enter your password to change it.'
          : 'Set a 4-6 digit PIN — required before any withdrawal or transfer to another Trecco user.'}
      </p>

      <form onSubmit={submit}>
        <label style={labelStyle}>
          Account password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ ...inputStyle, letterSpacing: 'normal' }}
          />
        </label>

        <label style={labelStyle}>
          {hasPin ? 'New PIN' : 'PIN'}
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Confirm {hasPin ? 'new PIN' : 'PIN'}
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            required
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: '#34c471', fontSize: 13, marginBottom: 12 }}>PIN saved successfully.</p>}

        <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : hasPin ? 'Update PIN' : 'Set PIN'}
        </button>
      </form>
    </main>
  );
}
