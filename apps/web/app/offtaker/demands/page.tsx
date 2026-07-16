'use client';
// Offtaker's own demand board — create, edit, delete, and attach a photo
// to demands they've posted. Separate auth/token from the member side.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireOfftakerAuth, getOfftakerToken, clearOfftakerSession } from '../../../lib/offtaker-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Demand {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  deadline: string | null;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  offers: { id: string }[];
}

async function api(path: string, options: RequestInit = {}) {
  const token = getOfftakerToken();
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

const inputStyle = {
  height: 34,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#0b0b0d',
  color: '#f5f5f5',
  padding: '0 10px',
  fontSize: 13,
} as const;

const labelStyle = { fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 } as const;

export default function MyDemandsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: '',
    quantity: '',
    unit: 'bags',
    pricePerUnit: '',
    deadline: '',
  });

  async function load() {
    try {
      setDemands(await api('/marketplace/my-demands'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireOfftakerAuth(router)) return;
    load();
  }, []);

  function logout() {
    clearOfftakerSession();
    router.push('/offtaker/login');
  }

  function editDemand(d: Demand) {
    setEditingId(d.id);
    setForm({
      productName: d.productName,
      quantity: String(d.quantity),
      unit: d.unit,
      pricePerUnit: String(d.pricePerUnit),
      deadline: d.deadline ? d.deadline.slice(0, 10) : '',
    });
    setShowForm(true);
  }

  async function submitDemand() {
    if (!form.productName || !form.quantity || !form.pricePerUnit) {
      setError('Product name, quantity, and price are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        productName: form.productName,
        quantity: Number(form.quantity),
        unit: form.unit,
        pricePerUnit: Number(form.pricePerUnit),
        deadline: form.deadline || null,
      };
      if (editingId) {
        await api(`/marketplace/demands/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/marketplace/demands', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm({ productName: '', quantity: '', unit: 'bags', pricePerUnit: '', deadline: '' });
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDemand(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await api(`/marketplace/demands/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadImage(id: string, file: File) {
    setUploadingId(id);
    setError(null);
    try {
      const token = getOfftakerToken();
      const body = new FormData();
      body.append('image', file);
      const res = await fetch(`${API_BASE}/marketplace/demands/${id}/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingId(null);
    }
  }

  function statusColor(status: string) {
    if (status === 'MATCHED') return '#34c471';
    if (status === 'CLOSED') return '#9a9a9f';
    return '#e0a020';
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>My demands</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              if (showForm) setEditingId(null);
              setShowForm(!showForm);
            }}
            style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Post demand'}
          </button>
          <button
            onClick={logout}
            style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Demands you've posted. Members can browse and offer to supply anything marked OPEN.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {showForm && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Product name</label>
              <input type="text" placeholder="Maize" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={{ ...inputStyle, width: '100%' }}>
                <option value="tonnes">tonnes</option>
                <option value="bags">bags</option>
                <option value="litres">litres</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Quantity needed</label>
              <input type="number" placeholder="500" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Price per unit (₦)</label>
              <input type="number" placeholder="8500" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button
            onClick={submitDemand}
            disabled={saving}
            style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Post demand'}
          </button>
        </div>
      )}

      {demands.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No demands posted yet.</p>
      )}

      {demands.map((d) => (
        <div key={d.id} style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{d.productName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                {d.quantity} {d.unit} · ₦{Number(d.pricePerUnit).toLocaleString()}/{d.unit} · {d.offers.length} offer{d.offers.length === 1 ? '' : 's'}
              </p>
            </div>
            <span style={{ fontSize: 12, color: statusColor(d.status) }}>{d.status}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
            <label style={{ fontSize: 12, color: '#9a9a9f', cursor: 'pointer' }}>
              {uploadingId === d.id ? 'Uploading…' : d.imageUrl ? 'Replace photo' : '+ Add photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                disabled={uploadingId === d.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(d.id, file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              onClick={() => editDemand(d)}
              style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              onClick={() => deleteDemand(d.id)}
              disabled={deletingId === d.id || d.offers.length > 0}
              title={d.offers.length > 0 ? 'Cannot delete — offers already submitted' : ''}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid #e5484d',
                color: '#e5484d',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: deletingId === d.id || d.offers.length > 0 ? 'default' : 'pointer',
                opacity: deletingId === d.id || d.offers.length > 0 ? 0.5 : 1,
              }}
            >
              {deletingId === d.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
