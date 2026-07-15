'use client';

// Member flow: request a virtual or physical ATM card. Physical requires a
// delivery address up front (see prisma/schema.prisma CardRequest — the
// address is captured once at request time and is never editable after,
// so there's a clean audit trail of what address a card actually shipped to).
// Status polling here is intentionally simple (fetch on load); swap for
// SWR/React Query once the rest of the dashboard picks a data-fetching lib.

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

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Awaiting admin approval',
  APPROVED: 'Approved',
  FEE_DEDUCTED: 'Fee deducted — issuing card',
  ISSUING: 'Issuing card',
  ISSUED: 'Card issued',
  DISPATCHED: 'Out for delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  FAILED: 'Issuance failed — contact support',
  CANCELLED: 'Cancelled',
};

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
    <main>
      <h1>ATM Card</h1>

      <section>
        <h2>Request a new card</h2>
        <label>
          <input type="radio" checked={cardType === 'VIRTUAL'} onChange={() => setCardType('VIRTUAL')} />
          Virtual card
        </label>
        <label>
          <input type="radio" checked={cardType === 'PHYSICAL'} onChange={() => setCardType('PHYSICAL')} />
          Physical card
        </label>

        {cardType === 'PHYSICAL' && (
          <fieldset>
            <legend>Delivery address</legend>
            <input placeholder="Full name" value={address.fullName}
              onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            <input placeholder="Phone" value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            <input placeholder="Address line 1" value={address.addressLine1}
              onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} />
            <input placeholder="Address line 2 (optional)" value={address.addressLine2}
              onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} />
            <input placeholder="City" value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <input placeholder="State" value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <input placeholder="Country" value={address.country}
              onChange={(e) => setAddress({ ...address, country: e.target.value })} />
          </fieldset>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </section>

      <section>
        <h2>Your requests</h2>
        <table>
          <thead>
            <tr><th>Type</th><th>Status</th><th>Fee</th><th>Submitted</th><th>Tracking</th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.cardType}</td>
                <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                <td>{r.feeAmount != null ? `₦${r.feeAmount}` : '—'}</td>
                <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                <td>{r.trackingReference ? `${r.courier}: ${r.trackingReference}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
