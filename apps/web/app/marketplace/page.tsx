'use client';
// Member marketplace: browse open demands posted by offtakers, and submit
// an offer to supply. Accept/decline of offers happens on the admin side
// (not built yet as a web page — currently curl/Prisma Studio only).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Demand {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  deadline: string | null;
  status: string;
  offtaker: { companyName: string; contactPhone: string };
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
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offerAmounts, setOfferAmounts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  async function load() {
    try {
      setDemands(await api('/marketplace/demands'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function submitOffer(demandId: string) {
    const raw = offerAmounts[demandId];
    const quantityOffered = Number(raw);
    if (!quantityOffered || quantityOffered <= 0) {
      setError('Enter a valid quantity greater than zero');
      return;
    }
    setSubmittingId(demandId);
    setError(null);
    try {
      await api(`/marketplace/demands/${demandId}/offers`, {
        method: 'POST',
        body: JSON.stringify({ quantityOffered }),
      });
      setConfirmedIds((prev) => new Set(prev).add(demandId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Marketplace</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Open demands from verified offtakers. Offer to supply what you have.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {demands.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No open demands right now.</p>
      )}

      {demands.map((demand) => (
        <div
          key={demand.id}
          style={{
            background: '#1f1f23',
            border: '1px solid #2a2a2e',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {demand.productName} &middot; {demand.quantity} {demand.unit}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                {demand.offtaker.companyName}
              </p>
            </div>
            <span
              style={{
                background: 'rgba(52,196,113,0.15)',
                color: '#34c471',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 8,
              }}
            >
              {demand.status}
            </span>
          </div>

          <p style={{ margin: '10px 0', fontSize: 12, color: '#9a9a9f' }}>
            Offering {formatNaira(demand.pricePerUnit)} / {demand.unit}
            {demand.deadline ? ` · Deadline ${new Date(demand.deadline).toLocaleDateString()}` : ''}
          </p>

          {confirmedIds.has(demand.id) ? (
            <p style={{ fontSize: 12, color: '#34c471', margin: 0 }}>Offer submitted &mdash; awaiting admin review.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                placeholder={`Quantity (${demand.unit})`}
                value={offerAmounts[demand.id] ?? ''}
                onChange={(e) => setOfferAmounts({ ...offerAmounts, [demand.id]: e.target.value })}
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
                onClick={() => submitOffer(demand.id)}
                disabled={submittingId === demand.id}
                style={{
                  background: '#8a1414',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: submittingId === demand.id ? 'default' : 'pointer',
                  opacity: submittingId === demand.id ? 0.7 : 1,
                }}
              >
                {submittingId === demand.id ? 'Sending…' : 'Offer to supply'}
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
