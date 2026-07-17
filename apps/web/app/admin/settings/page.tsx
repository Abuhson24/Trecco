'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trecco_token') : null;
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

const card = { background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 } as const;
const sectionTitle = { fontSize: 15, fontWeight: 600, margin: '28px 0 12px' } as const;
const primaryBtn = {
  background: '#8a1414',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
} as const;
const tokenBox = {
  fontFamily: 'monospace',
  fontSize: 14,
  background: '#0b0b0d',
  border: '1px solid #2a2a2e',
  borderRadius: 8,
  padding: '10px 12px',
  letterSpacing: '0.5px',
  wordBreak: 'break-all' as const,
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const data = await api('/cooperative/mine/token');
      setJoinToken(data.joinToken);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAdmin(router)) return;
    load();
  }, []);

  async function copyToken() {
    if (!joinToken) return;
    try {
      await navigator.clipboard.writeText(joinToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — please copy the token manually');
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Cooperative Settings</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', margin: '4px 0 0' }}>
        Share your cooperative's join token with prospective members so they can join from their dashboard.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginTop: 16 }}>{error}</p>}

      <h2 style={sectionTitle}>Join Token</h2>
      <div style={card}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#9a9a9f' }}>
          Anyone with this token can join your cooperative as a member. Share it only with people you want to add
          — for example over WhatsApp or SMS.
        </p>
        {joinToken ? (
          <>
            <div style={tokenBox}>{joinToken}</div>
            <button onClick={copyToken} style={{ ...primaryBtn, marginTop: 10 }}>
              {copied ? 'Copied!' : 'Copy token'}
            </button>
          </>
        ) : (
          !error && <p style={{ margin: 0, fontSize: 13, color: '#9a9a9f' }}>Loading…</p>
        )}
      </div>
    </main>
  );
}
