'use client';
// Admin-only: review, approve, or reject pending virtual card requests.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface PendingCard {
  id: string;
  memberName: string;
  memberId: string;
  createdAt: string;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function load() {
    try {
      setCards(await api('/cards/admin/requests/pending'));
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
    setBusyId(cardId);
    setError(null);
    try {
      await api(`/cards/admin/requests/${cardId}/approve`, { method: 'POST' });
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function rejectCard(cardId: string) {
    const reason = reasons[cardId]?.trim();
    if (!reason) {
      setError('Enter a reason for rejection');
      return;
    }
    setBusyId(cardId);
    setError(null);
    try {
      await api(`/cards/admin/requests/${cardId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
      setRejectingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          borderRadius: 14,
          padding: '22px 24px',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, color: '#fff' }}>Pending virtual cards</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '6px 0 0' }}>
          Card requests awaiting admin approval.
        </p>
      </div>

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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{card.memberName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                Requested {new Date(card.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRejectingId(rejectingId === card.id ? null : card.id)}
                style={{
                  background: 'transparent',
                  color: '#e5484d',
                  border: '1px solid #4a2a2a',
                  borderRadius: 8,
                  padding: '0 14px',
                  height: 34,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                onClick={() => approveCard(card.id)}
                disabled={busyId === card.id}
                style={{
                  background: '#8a1414',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  height: 34,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: busyId === card.id ? 'default' : 'pointer',
                  opacity: busyId === card.id ? 0.7 : 1,
                }}
              >
                {busyId === card.id ? 'Working…' : 'Approve'}
              </button>
            </div>
          </div>

          {rejectingId === card.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="text"
                placeholder="Reason for rejection"
                value={reasons[card.id] ?? ''}
                onChange={(e) => setReasons({ ...reasons, [card.id]: e.target.value })}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid #2a2a2e',
                  background: '#0b0b0d',
                  color: '#f5f5f5',
                  padding: '0 10px',
                }}
              />
              <button
                onClick={() => rejectCard(card.id)}
                disabled={busyId === card.id}
                style={{
                  background: '#e5484d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: busyId === card.id ? 'default' : 'pointer',
                  opacity: busyId === card.id ? 0.7 : 1,
                }}
              >
                Confirm reject
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
