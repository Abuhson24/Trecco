'use client';
// Admin management of demands and offers — accept, decline, and mark
// accepted offers as fulfilled. This is the first web UI for this flow;
// previously only reachable via curl/Prisma Studio.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Offer {
  id: string;
  quantityOffered: string;
  status: string;
  submittedAt: string;
  member: { id: string; fullName: string; phone: string };
}

interface Demand {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  status: string;
  offtaker: { companyName: string };
  offers: Offer[];
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

function statusColor(status: string) {
  if (status === 'ACCEPTED' || status === 'FULFILLED' || status === 'MATCHED') return '#34c471';
  if (status === 'DECLINED') return '#e5484d';
  return '#e0a020';
}

export default function AdminMarketplacePage() {
  const router = useRouter();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

  async function load() {
    try {
      setDemands(await api('/marketplace/admin/demands'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAdmin(router)) return;
    load();
  }, []);

  async function act(offerId: string, action: 'accept' | 'decline' | 'fulfill') {
    setBusyOfferId(offerId);
    setError(null);
    try {
      await api(`/marketplace/offers/${offerId}/${action}`, { method: 'POST' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyOfferId(null);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Demands & offers</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Every demand posted, across every offtaker. Expand to accept, decline, or fulfill offers.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {demands.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No demands posted yet.</p>
      )}

      {demands.map((demand) => (
        <div key={demand.id} style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div
            onClick={() => setExpandedId(expandedId === demand.id ? null : demand.id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {demand.productName} · {demand.quantity} {demand.unit}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                {demand.offtaker.companyName} · {demand.offers.length} offer{demand.offers.length === 1 ? '' : 's'}
              </p>
            </div>
            <span style={{ fontSize: 12, color: statusColor(demand.status) }}>{demand.status}</span>
          </div>

          {expandedId === demand.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
              {demand.offers.length === 0 && (
                <p style={{ fontSize: 12, color: '#9a9a9f' }}>No offers submitted yet.</p>
              )}
              {demand.offers.map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    background: '#141416',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      {offer.member.fullName} — {offer.quantityOffered} {demand.unit}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: statusColor(offer.status) }}>
                      {offer.status}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {offer.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => act(offer.id, 'accept')}
                          disabled={busyOfferId === offer.id}
                          style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => act(offer.id, 'decline')}
                          disabled={busyOfferId === offer.id}
                          style={{ background: 'transparent', border: '1px solid #e5484d', color: '#e5484d', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {offer.status === 'ACCEPTED' && (
                      <button
                        onClick={() => act(offer.id, 'fulfill')}
                        disabled={busyOfferId === offer.id}
                        style={{ background: '#34c471', color: '#0b0b0d', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {busyOfferId === offer.id ? 'Marking…' : 'Mark fulfilled'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
