'use client';
// Offtaker login — separate from the member /login page, separate token,
// separate identity type entirely (see offtaker-auth.guard.ts on the backend).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveOfftakerSession } from '../../../lib/offtaker-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function OfftakerLoginPage() {
  const router = useRouter();
  const [contactEmail, setContactEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/offtaker-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Login failed');
      saveOfftakerSession(data.accessToken);
      router.push('/offtaker/demands');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Offtaker login</h1>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Contact email</label>
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px', marginBottom: 12, boxSizing: 'border-box' }}
      />

      <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px', marginBottom: 20, boxSizing: 'border-box' }}
      />

      <button
        onClick={submit}
        disabled={loading}
        style={{ width: '100%', background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Logging in…' : 'Log in'}
      </button>
    </main>
  );
}
