'use client';
// Member's own produce/stock. Members add and edit their own items;
// admin sees a cross-member feed at /admin/inventory instead.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  estimatedValue: string | null;
  status: string;
  createdAt: string;
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

const CATEGORIES = ['SEEDS', 'FERTILIZER', 'EQUIPMENT', 'PRODUCE', 'OTHER'];

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'PRODUCE',
    quantity: '',
    unit: '',
    estimatedValue: '',
  });

  async function load() {
    try {
      setItems(await api('/inventory/mine'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function submitItem() {
    if (!form.name || !form.quantity || !form.unit) {
      setError('Name, quantity, and unit are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          quantity: Number(form.quantity),
          unit: form.unit,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        }),
      });
      setForm({ name: '', category: 'PRODUCE', quantity: '', unit: '', estimatedValue: '' });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function statusColor(status: string) {
    if (status === 'LOW_STOCK') return '#e0a020';
    if (status === 'OUT_OF_STOCK') return '#e5484d';
    return '#34c471';
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>My inventory</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#8a1414',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ Add produce'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Your own stock and produce. The admin sees a live feed of what you add.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {showForm && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Item name (e.g. Maize)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ flex: 2, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px' }}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px' }}
            />
            <input
              type="text"
              placeholder="Unit (e.g. bags)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px' }}
            />
            <input
              type="number"
              placeholder="Est. value (optional)"
              value={form.estimatedValue}
              onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px' }}
            />
          </div>
          <button
            onClick={submitItem}
            disabled={saving}
            style={{
              background: '#8a1414',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save item'}
          </button>
        </div>
      )}

      {items.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No items yet — add your first produce above.</p>
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{item.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
              {item.category} &middot; {item.quantity} {item.unit}
            </p>
          </div>
          <span style={{ fontSize: 12, color: statusColor(item.status) }}>{item.status.replace('_', ' ')}</span>
        </div>
      ))}
    </main>
  );
}
