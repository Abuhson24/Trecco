'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession, getToken } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Mode = 'join' | 'create';

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('join');

  const [token, setToken] = useState('');

  const [cooperativeName, setCooperativeName] = useState('');
  const [country, setCountry] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [isExistingCooperative, setIsExistingCooperative] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'create' && isExistingCooperative === null) {
      setError('Please select whether this cooperative already exists offline');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'join' ? '/cooperative/join' : '/cooperative';
      const body = mode === 'join' ? { token } : { cooperativeName, country, focusArea, isExistingCooperative };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message ?? 'Something went wrong');
      }
      const data = await res.json();

      saveSession(data.accessToken, data.member.role, data.member.cooperativeId);

      router.push(
        data.member.role === 'COOP_ADMIN' || data.member.role === 'TREMMA_SUPER_ADMIN' ? '/admin/cards' : '/cards',
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <img src="/logo.svg" alt="Trecco" width={36} height={36} style={{ borderRadius: 8 }} />
        <span style={{ fontSize: 20, fontWeight: 600 }}>Trecco</span>
      </div>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 24 }}>
        You're not part of a cooperative yet. Join one with a token from your admin, or start your own.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" onClick={() => setMode('join')} style={tabStyle(mode === 'join')}>
          Join with a token
        </button>
        <button type="button" onClick={() => setMode('create')} style={tabStyle(mode === 'create')}>
          Start a cooperative
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'join' ? (
          <label style={labelStyle}>
            Cooperative token
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token your admin sent you"
              required
              style={inputStyle}
            />
          </label>
        ) : (
          <>
            <label style={labelStyle}>
              Cooperative name
              <input value={cooperativeName} onChange={(e) => setCooperativeName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Country
              <input value={country} onChange={(e) => setCountry(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Focus area
              <input value={focusArea} onChange={(e) => setFocusArea(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Is this cooperative already active offline, or brand new?
              <select
                value={isExistingCooperative === null ? '' : String(isExistingCooperative)}
                onChange={(e) => setIsExistingCooperative(e.target.value === 'true')}
                required
                style={inputStyle}
              >
                <option value="" disabled>Select one</option>
                <option value="true">Already exists — bringing it onto Trecco</option>
                <option value="false">Brand new — recruiting members</option>
              </select>
            </label>
          </>
        )}

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
          {loading ? 'Submitting…' : mode === 'join' ? 'Join cooperative' : 'Create cooperative'}
        </button>
      </form>
    </main>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid #2a2a2e',
    background: active ? '#8a1414' : '#1f1f23',
    color: active ? '#fff' : '#9a9a9f',
    fontSize: 13,
    cursor: 'pointer',
  };
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: '#9a9a9f' };

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
