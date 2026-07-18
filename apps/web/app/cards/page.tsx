'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';
import type { CardRequest, CardType } from '@trecco/shared-types';

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

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  PENDING_APPROVAL: { label: 'Awaiting admin approval', color: '#e0a020' },
  APPROVED: { label: 'Approved', color: '#34c471' },
  FEE_DEDUCTED: { label: 'Fee deducted — issuing card', color: '#e0a020' },
  ISSUING: { label: 'Issuing card', color: '#e0a020' },
  ISSUED: { label: 'Card issued', color: '#34c471' },
  DISPATCHED: { label: 'Out for delivery', color: '#5b9bd5' },
  DELIVERED: { label: 'Delivered', color: '#34c471' },
  REJECTED: { label: 'Rejected', color: '#e5484d' },
  FAILED: { label: 'Issuance failed — contact support', color: '#e5484d' },
  CANCELLED: { label: 'Cancelled', color: '#9a9a9f' },
};

const inputStyle = {
  height: 36,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#0b0b0d',
  color: '#f5f5f5',
  padding: '0 10px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
} as const;

const labelStyle = { fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 } as const;

export default function CardsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [cardType, setCardType] = useState<CardType>('VIRTUAL');
  const [address, setAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', country: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRequests(await api('/cards/my-requests'));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api('/cards/request', {
        method: 'POST',
        body: JSON.stringify({
          cardType,
          ...(cardType === 'PHYSICAL' ? { deliveryAddress: address } : {}),
        }),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>ATM Card</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 24 }}>
        Request a virtual card instantly, or order a physical card for delivery.
      </p>

      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 28,
          background: 'linear-gradient(135deg, #2a0d0d 0%, #0b0b0d 60%)',
          padding: '32px 24px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <img
          src="/trecco-card.jpg"
          alt="Trecco debit card"
          style={{
            maxWidth: 380,
            width: '100%',
            height: 'auto',
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            transform: 'rotate(-3deg)',
          }}
        />
      </div>

      <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Request a new card</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setCardType('VIRTUAL')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: cardType === 'VIRTUAL' ? '1px solid #8a1414' : '1px solid #2a2a2e',
              background: cardType === 'VIRTUAL' ? 'rgba(138,20,20,0.15)' : 'transparent',
              color: '#f5f5f5',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Virtual card
          </button>
          <button
            onClick={() => setCardType('PHYSICAL')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: cardType === 'PHYSICAL' ? '1px solid #8a1414' : '1px solid #2a2a2e',
              background: cardType === 'PHYSICAL' ? 'rgba(138,20,20,0.15)' : 'transparent',
              color: '#f5f5f5',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Physical card
          </button>
        </div>

        {cardType === 'PHYSICAL' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address line 1</label>
              <input style={inputStyle} value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address line 2 (optional)</label>
              <input style={inputStyle} value={address.addressLine2} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
            </div>
          </div>
        )}

        {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          style={{
            background: '#8a1414',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 500,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Your requests</p>

      {requests.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No card requests yet.</p>
      )}

      {requests.map((r) => {
        const info = STATUS_INFO[r.status] ?? { label: r.status, color: '#9a9a9f' };
        return (
          <div key={r.id} style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                  {r.cardType === 'VIRTUAL' ? 'Virtual card' : 'Physical card'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                  Requested {new Date(r.submittedAt).toLocaleDateString()}
                  {r.feeAmount != null ? ` · ₦${r.feeAmount} fee` : ''}
                </p>
                {r.trackingReference && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                    {r.courier}: {r.trackingReference}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 12, color: info.color, whiteSpace: 'nowrap' }}>{info.label}</span>
            </div>
          </div>
        );
      })}
    </main>
  );
}
