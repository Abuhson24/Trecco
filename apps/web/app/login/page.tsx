'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Login failed');
      }
      const data = await res.json();
      saveSession(data.accessToken, data.member.role);
      router.push(data.member.role === 'COOP_ADMIN' || data.member.role === 'TREMMA_SUPER_ADMIN' ? '/admin/cards' : '/cards');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#8a1414' }} />
        <span style={{ fontSize: 20, fontWeight: 600 }}>Trecco</span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13, color: '#9a9a9f' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13, color: '#9a9a9f' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: '#e5484d', fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: '#8a1414',
            color: '#fff',
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  height: 36,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#1f1f23',
  color: '#f5f5f5',
  padding: '0 10px',
  boxSizing: 'border-box',
};
