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
  variety: string | null;
  growingMethod: string | null;
  plantingDate: string | null;
  harvestDate: string | null;
  askingPriceCurrency: string | null;
  askingPriceAmount: string | null;
  negotiable: boolean;
  bulkDiscountAvailable: boolean;
  minSellingPriceCurrency: string | null;
  minSellingPriceAmount: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface Demand {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
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

const CATEGORIES = ['SEEDS', 'FERTILIZER', 'EQUIPMENT', 'PRODUCE', 'GRAIN', 'OTHER'];
const UNITS = ['tonnes', 'bags', 'litres', 'other'];
const GROWING_METHODS = ['ORGANIC', 'CONVENTIONAL'];
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'JPY', 'CNY', 'AED'];

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

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [member, setMember] = useState<{ fullName: string; address: string | null; phone: string; email: string } | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [listingItemId, setListingItemId] = useState<string | null>(null);
  const [listingDemandId, setListingDemandId] = useState('');
  const [listingQuantity, setListingQuantity] = useState('');
  const [listingBusy, setListingBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'PRODUCE',
    quantity: '',
    unit: 'bags',
    variety: '',
    growingMethod: 'CONVENTIONAL',
    plantingDate: '',
    harvestDate: '',
    askingPriceCurrency: 'NGN',
    askingPriceAmount: '',
    negotiable: false,
    bulkDiscountAvailable: false,
    minSellingPriceCurrency: 'NGN',
    minSellingPriceAmount: '',
  });

  async function load() {
    try {
      setItems(await api('/inventory/mine'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadMember() {
    try {
      const me = await api('/auth/me');
      setMember({ fullName: me.fullName, address: me.address, phone: me.phone, email: me.email });
    } catch (e) {
      // non-fatal — print header just won't show member details if this fails
    }
  }

  async function loadDemands() {
    try {
      const open = await api('/marketplace/demands');
      setDemands(open.filter((d: Demand) => d.status === 'OPEN'));
    } catch (e) {
      // non-fatal — listing picker just won't have options if this fails
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
    loadMember();
    loadDemands();
  }, []);

  function update(field: string, value: any) {
    setForm({ ...form, [field]: value });
  }

  function editItem(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      variety: item.variety ?? '',
      growingMethod: item.growingMethod ?? 'CONVENTIONAL',
      plantingDate: item.plantingDate ? item.plantingDate.slice(0, 10) : '',
      harvestDate: item.harvestDate ? item.harvestDate.slice(0, 10) : '',
      askingPriceCurrency: item.askingPriceCurrency ?? 'NGN',
      askingPriceAmount: item.askingPriceAmount ?? '',
      negotiable: item.negotiable,
      bulkDiscountAvailable: item.bulkDiscountAvailable,
      minSellingPriceCurrency: item.minSellingPriceCurrency ?? 'NGN',
      minSellingPriceAmount: item.minSellingPriceAmount ?? '',
    });
    setShowForm(true);
  }

  async function submitListing(itemId: string) {
    if (!listingDemandId || !listingQuantity || Number(listingQuantity) <= 0) {
      setError('Choose a demand and enter a valid quantity');
      return;
    }
    setListingBusy(true);
    setError(null);
    try {
      await api(`/inventory/${itemId}/list-to-marketplace/${listingDemandId}`, {
        method: 'POST',
        body: JSON.stringify({ quantityOffered: Number(listingQuantity) }),
      });
      setListingItemId(null);
      setListingDemandId('');
      setListingQuantity('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setListingBusy(false);
    }
  }

  async function submitItem() {
    if (!form.name || !form.quantity || !form.unit) {
      setError('Name, quantity, and unit are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        variety: form.variety || null,
        growingMethod: form.growingMethod,
        plantingDate: form.plantingDate || null,
        harvestDate: form.harvestDate || null,
        askingPriceCurrency: form.askingPriceCurrency,
        askingPriceAmount: form.askingPriceAmount ? Number(form.askingPriceAmount) : null,
        negotiable: form.negotiable,
        bulkDiscountAvailable: form.bulkDiscountAvailable,
        minSellingPriceCurrency: form.minSellingPriceCurrency,
        minSellingPriceAmount: form.minSellingPriceAmount ? Number(form.minSellingPriceAmount) : null,
      };
      if (editingId) {
        await api(`/inventory/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/inventory', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm({
        name: '', category: 'PRODUCE', quantity: '', unit: 'bags', variety: '',
        growingMethod: 'CONVENTIONAL', plantingDate: '', harvestDate: '',
        askingPriceCurrency: 'NGN', askingPriceAmount: '', negotiable: false,
        bulkDiscountAvailable: false, minSellingPriceCurrency: 'NGN', minSellingPriceAmount: '',
      });
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItemHandler(itemId: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    setDeletingId(itemId);
    setError(null);
    try {
      await api(`/inventory/${itemId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadImageHandler(itemId: string, file: File) {
    setUploadingId(itemId);
    setError(null);
    try {
      const token = localStorage.getItem('trecco_token');
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/inventory/${itemId}/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingId(null);
    }
  }

  function statusColor(status: string) {
    if (status === 'LOW_STOCK') return '#e0a020';
    if (status === 'OUT_OF_STOCK') return '#e5484d';
    return '#34c471';
  }

  function fmtPrice(currency: string | null, amount: string | null) {
    if (!amount) return null;
    return `${currency ?? 'NGN'} ${Number(amount).toLocaleString()}`;
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 16px' }}>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; color: #000 !important; }
          nav { display: none !important; }
        }
      `}</style>

      <div className="print-only" style={{ display: 'none', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #8a1414' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img src="/logo-icon.png" alt="Trecco" width={40} height={40} style={{ borderRadius: 8 }} />
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#000' }}>TRECCO</p>
            <p style={{ margin: 0, fontSize: 11, color: '#555' }}>Official Inventory Report</p>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#000', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong>Farmer:</strong> {member?.fullName ?? '—'}</p>
          <p style={{ margin: 0 }}><strong>Address:</strong> {member?.address ?? 'Not provided'}</p>
          <p style={{ margin: 0 }}><strong>Phone:</strong> {member?.phone ?? '—'}</p>
          <p style={{ margin: 0 }}><strong>Email:</strong> {member?.email ?? '—'}</p>
          <p style={{ margin: '4px 0 0' }}><strong>Date printed:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div
        className="no-print"
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
          background: '#1f1f23',
        }}
      >
        <img
          src="/trecco-inventory-hero.png"
          alt="Trecco Inventory"
          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>My inventory</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{ background: 'transparent', color: '#9a9a9f', border: '1px solid #2a2a2e', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Print
          </button>
          <button
            onClick={() => {
              if (showForm) setEditingId(null);
              setShowForm(!showForm);
            }}
            className="no-print"
            style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Add produce'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Your own stock and produce. The admin sees a live feed of what you add.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {showForm && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 20 }}>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Item name</label>
              <input type="text" placeholder="Maize" value={form.name} onChange={(e) => update('name', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Variety</label>
              <input type="text" placeholder="SAMMAZ 52" value={form.variety} onChange={(e) => update('variety', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Growing method</label>
              <select value={form.growingMethod} onChange={(e) => update('growingMethod', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {GROWING_METHODS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Quantity</label>
              <input type="number" placeholder="120" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unit</label>
              <select value={form.unit} onChange={(e) => update('unit', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Planting date</label>
              <input type="date" value={form.plantingDate} onChange={(e) => update('plantingDate', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Harvest date</label>
              <input type="date" value={form.harvestDate} onChange={(e) => update('harvestDate', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Asking price currency</label>
              <select value={form.askingPriceCurrency} onChange={(e) => update('askingPriceCurrency', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Asking price amount</label>
              <input type="number" placeholder="8500" value={form.askingPriceAmount} onChange={(e) => update('askingPriceAmount', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Minimum selling price currency</label>
              <select value={form.minSellingPriceCurrency} onChange={(e) => update('minSellingPriceCurrency', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Minimum selling price amount</label>
              <input type="number" placeholder="7500" value={form.minSellingPriceAmount} onChange={(e) => update('minSellingPriceAmount', e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.negotiable} onChange={(e) => update('negotiable', e.target.checked)} />
              Negotiable
            </label>
            <label style={{ fontSize: 13, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.bulkDiscountAvailable} onChange={(e) => update('bulkDiscountAvailable', e.target.checked)} />
              Bulk discount available
            </label>
          </div>

          <button
            onClick={submitItem}
            disabled={saving}
            style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save item'}
          </button>
        </div>
      )}

      {items.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No items yet — add your first produce above.</p>
      )}

      {items.map((item) => (
        <div key={item.id} style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {item.imageUrl ? (
              <img
                src={`${API_BASE}${item.imageUrl}`}
                alt={item.name}
                style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 8, background: '#0b0b0d', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {item.name}{item.variety ? ` · ${item.variety}` : ''}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                {item.category} · {item.quantity} {item.unit}{item.growingMethod ? ` · ${item.growingMethod}` : ''}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
                Added {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span style={{ fontSize: 12, color: statusColor(item.status) }}>{item.status.replace('_', ' ')}</span>
          </div>

          {(item.askingPriceAmount || item.minSellingPriceAmount || item.harvestDate) && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2a2e', fontSize: 12, color: '#9a9a9f' }}>
              {item.askingPriceAmount && <span style={{ marginRight: 16 }}>Asking: {fmtPrice(item.askingPriceCurrency, item.askingPriceAmount)}</span>}
              {item.minSellingPriceAmount && <span style={{ marginRight: 16 }}>Min: {fmtPrice(item.minSellingPriceCurrency, item.minSellingPriceAmount)}</span>}
              {item.negotiable && <span style={{ marginRight: 16, color: '#34c471' }}>Negotiable</span>}
              {item.bulkDiscountAvailable && <span style={{ color: '#34c471' }}>Bulk discount</span>}
              {item.harvestDate && <span style={{ display: 'block', marginTop: 4 }}>Harvest: {new Date(item.harvestDate).toLocaleDateString()}</span>}
            </div>
          )}

          <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
            <label style={{ fontSize: 12, color: '#9a9a9f', cursor: 'pointer' }}>
              {uploadingId === item.id ? 'Uploading…' : item.imageUrl ? 'Replace photo' : '+ Add photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                disabled={uploadingId === item.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImageHandler(item.id, file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              onClick={() => editItem(item)}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2e',
                color: '#9a9a9f',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                setListingItemId(listingItemId === item.id ? null : item.id);
                setListingDemandId('');
                setListingQuantity('');
              }}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2e',
                color: '#9a9a9f',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              List to marketplace
            </button>
            <button
              onClick={() => deleteItemHandler(item.id)}
              disabled={deletingId === item.id}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid #e5484d',
                color: '#e5484d',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: deletingId === item.id ? 'default' : 'pointer',
                opacity: deletingId === item.id ? 0.6 : 1,
              }}
            >
              {deletingId === item.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          {listingItemId === item.id && (
            <div className="no-print" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2a2e', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={listingDemandId}
                onChange={(e) => setListingDemandId(e.target.value)}
                style={{ ...inputStyle, flex: 2 }}
              >
                <option value="">Select an open demand…</option>
                {demands.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.productName} — {d.quantity} {d.unit} needed
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Qty to offer"
                value={listingQuantity}
                onChange={(e) => setListingQuantity(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => submitListing(item.id)}
                disabled={listingBusy}
                style={{
                  background: '#8a1414',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 14px',
                  height: 34,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: listingBusy ? 'default' : 'pointer',
                  opacity: listingBusy ? 0.7 : 1,
                }}
              >
                {listingBusy ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
