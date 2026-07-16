'use client';
// Admin-only: live feed of produce/stock members have added across the
// cooperative. Read-only — admins don't edit member items here, they just
// see what's coming in (per the "admin gets alerted" design).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface InventoryAlert {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  estimatedValue: string | null;
  status: string;
  createdAt: string;
  member: { id: string; fullName: string };
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

export default function AdminInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api('/inventory/admin/alerts'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  function statusColor(status: string) {
    if (status === 'LOW_STOCK') return '#e0a020';
    if (status === 'OUT_OF_STOCK') return '#e5484d';
    return '#34c471';
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Inventory alerts</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Produce and stock added by members across the cooperative, most recent first.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {items.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No inventory activity yet.</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
              {item.name} &middot; {item.quantity} {item.unit}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
              {item.member.fullName} &middot; {item.category} &middot; {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span style={{ fontSize: 12, color: statusColor(item.status) }}>{item.status.replace('_', ' ')}</span>
        </div>
      ))}
    </main>
  );
}
