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
      saveSession(data.accessToken, data.member.role, data.member.cooperativeId);
      router.push(
        !data.member.cooperativeId
          ? '/onboarding'
          : data.member.role === 'COOP_ADMIN' || data.member.role === 'TREMMA_SUPER_ADMIN'
          ? '/admin/cards'
          : '/wallet'
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        className="auth-photo-panel"
        style={{
          flex: 1,
          position: 'relative',
          backgroundImage:
            'linear-gradient(180deg, rgba(11,11,13,0.15) 0%, rgba(11,11,13,0.9) 100%), url(/images/login-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1f1f23',
        }}
      >
        <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
            Built by farmers, for farmers.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: '10px 0 0' }}>
            Savings, loans, and market access for cooperatives. Powered by Tremma Agro Limited.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <img src="/logo-icon.png" alt="Trecco" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>Trecco</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: '#9a9a9f', margin: '0 0 24px' }}>Let's get you in</p>

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
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: '#9a9a9f', marginTop: 20, textAlign: 'center' }}>
            New to Trecco?{' '}
            <a href="/signup" style={{ color: '#e5484d', textDecoration: 'none', fontWeight: 500 }}>
              Create an account
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .auth-photo-panel {
            display: none;
          }
        }
      `}</style>
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
