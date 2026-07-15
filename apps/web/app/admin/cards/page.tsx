'use client';

// Admin queue for card requests. Approve = deduct fee + trigger Xpress
// Wallet issuance (handled server-side in one call, see CardsService.approve).
// Dispatch/Delivered are separate steps for physical cards only, entered
// manually by the admin once a courier has the card (see README "What's
// stubbed" — Xpress Wallet fulfillment webhooks can replace this manual step
// later without changing the CardRequestStatus state machine).

import { useEffect, useState } from 'react';
import type { CardRequest } from '@trecco/shared-types';
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

export default function AdminCardsPage() {
  const router = useRouter();
  type AdminRow = CardRequest & { member: { fullName: string; email: string; phone: string } };
  const [pending, setPending] = useState<AdminRow[]>([]);
  const [awaitingDispatch, setAwaitingDispatch] = useState<AdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [p, d] = await Promise.all([
        api('/cards/admin/requests/pending'),
        api('/cards/admin/requests/awaiting-dispatch'),
      ]);
      setPending(p);
      setAwaitingDispatch(d);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAdmin(router)) return;
    load();
  }, []);

  async function act(id: string, action: 'approve' | 'reject', reason?: string) {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'approve') {
        await api(`/cards/admin/requests/${id}/approve`, { method: 'POST' });
      } else {
        await api(`/cards/admin/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function dispatch(id: string) {
    const courier = window.prompt('Courier name (e.g. GIG Logistics)');
    const trackingReference = courier ? window.prompt('Tracking reference') : null;
    if (!courier || !trackingReference) return;
    setBusyId(id);
    try {
      await api(`/cards/admin/requests/${id}/dispatch`, { method: 'POST', body: JSON.stringify({ courier, trackingReference }) });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      <h1>Card requests — pending approval</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr><th>Member</th><th>Type</th><th>Delivery</th><th>Submitted</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {pending.map((r) => (
            <tr key={r.id}>
              <td>{r.member.fullName}<br /><small>{r.member.email}</small></td>
              <td>{r.cardType}</td>
              <td>
                {r.cardType === 'PHYSICAL'
                  ? `${r.addressLine1}, ${r.city}, ${r.state}, ${r.country}`
                  : '—'}
              </td>
              <td>{new Date(r.submittedAt).toLocaleString()}</td>
              <td>
                <button disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}>
                  Approve &amp; deduct fee
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => {
                    const reason = window.prompt('Rejection reason');
                    if (reason) act(r.id, 'reject', reason);
                  }}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h1>Physical cards — ready to dispatch</h1>
      <table>
        <thead>
          <tr><th>Member</th><th>Delivery address</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {awaitingDispatch.map((r) => (
            <tr key={r.id}>
              <td>{r.member.fullName}</td>
              <td>{r.addressLine1}, {r.city}, {r.state}, {r.country}</td>
              <td>
                <button disabled={busyId === r.id} onClick={() => dispatch(r.id)}>
                  Mark dispatched
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
