'use client';
// Member wallet screen: personal account balance as hero, cooperative
// savings as a secondary stat, "Move to savings" as the one real action
// this page can perform right now (funding/withdrawal need Providus/Xpress
// Wallet wired in first — see wallet.service.ts TODOs).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Balance {
  personalBalance: string;
  cooperativeSavings: string;
  providusAccountNumber: string;
}

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

function formatNaira(value: string | number) {
  return `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [amount, setAmount] = useState('');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setBalance(await api('/wallet/balance'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function moveToSavings() {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount greater than zero');
      return;
    }
    setMoving(true);
    setError(null);
    try {
      const updated = await api('/wallet/move-to-savings', {
        method: 'POST',
        body: JSON.stringify({ amount: parsed }),
      });
      setBalance(updated);
      setAmount('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Wallet</h1>

      {!balance && !error && <p style={{ color: '#9a9a9f' }}>Loading…</p>}

      {balance && (
        <>
          <div
            style={{
              background: '#8a1414',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              Personal account &middot; {balance.providusAccountNumber}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600, color: '#fff' }}>
              {formatNaira(balance.personalBalance)}
            </p>
          </div>

          <div
            style={{
              background: '#1f1f23',
              border: '1px solid #2a2a2e',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#9a9a9f' }}>Cooperative savings</p>
              <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 500 }}>
                {formatNaira(balance.cooperativeSavings)}
              </p>
            </div>
          </div>

          <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500 }}>Move to savings</p>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9a9a9f' }}>
              Transfer from your personal account into your cooperative's pooled savings.
            </p>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                height: 36,
                borderRadius: 8,
                border: '1px solid #2a2a2e',
                background: '#0b0b0d',
                color: '#f5f5f5',
                padding: '0 10px',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />
            <button
              onClick={moveToSavings}
              disabled={moving}
              style={{
                width: '100%',
                height: 38,
                borderRadius: 8,
                border: 'none',
                background: '#8a1414',
                color: '#fff',
                fontWeight: 500,
                cursor: moving ? 'default' : 'pointer',
                opacity: moving ? 0.7 : 1,
              }}
            >
              {moving ? 'Moving…' : 'Move to savings'}
            </button>
          </div>
        </>
      )}

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginTop: 12 }}>{error}</p>}
    </main>
  );
}
