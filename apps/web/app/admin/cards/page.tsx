'use client';
// Admin-only: review and approve pending virtual card requests.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface PendingCard {
  id: string;
  memberName: string;
  memberId: string;
  requestedAt: string;
  status: string;
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

export default function PendingCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<PendingCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function load() {
    try {
      setCards(await api('/cards/pending'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function approveCard(cardId: string) {
    setApprovingId(cardId);
    setError(null);
    try {
      await api(`/cards/${cardId}/approve`, { method: 'POST' });
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Pending virtual cards</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Card requests awaiting admin approval.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {cards.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No pending card requests.</p>
      )}

      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            background: '#1f1f23',
            border: '1px solid #2a2a2e',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{card.memberName}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
              Requested {new Date(card.requestedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => approveCard(card.id)}
            disabled={approvingId === card.id}
            style={{
              background: '#8a1414',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0 16px',
              height: 34,
              fontSize: 13,
              fontWeight: 500,
              cursor: approvingId === card.id ? 'default' : 'pointer',
              opacity: approvingId === card.id ? 0.7 : 1,
            }}
          >
            {approvingId === card.id ? 'Approving…' : 'Approve'}
          </button>
        </div>
      ))}
    </main>
  );
}
