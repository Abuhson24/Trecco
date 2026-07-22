'use client';
// Airtime/Data purchase. Airtime uses a free-form amount; data plans are
// fixed-price and must be picked from VTpass's variation list for the
// chosen network — fetched fresh each time since prices/availability can
// change (see GET /bills/data-variations on the backend).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const AIRTIME_NETWORKS = [
  { serviceId: 'mtn', label: 'MTN' },
  { serviceId: 'glo', label: 'Glo' },
  { serviceId: 'airtel', label: 'Airtel' },
  { serviceId: 'etisalat', label: '9mobile' },
];

const DATA_NETWORKS = [
  { serviceId: 'mtn-data', label: 'MTN' },
  { serviceId: 'glo-data', label: 'Glo' },
  { serviceId: 'airtel-data', label: 'Airtel' },
  { serviceId: 'etisalat-data', label: '9mobile' },
];

interface DataVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
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

const inputStyle = {
  display: 'block',
  width: '100%',
  height: 36,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#0b0b0d',
  color: '#f5f5f5',
  padding: '0 10px',
  boxSizing: 'border-box',
  marginBottom: 10,
} as const;

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 34,
    borderRadius: 6,
    border: active ? '1px solid #8a1414' : '1px solid #2a2a2e',
    background: active ? 'rgba(138,20,20,0.15)' : 'transparent',
    color: '#f5f5f5',
    fontSize: 12,
    cursor: 'pointer',
  };
}

function networkChipStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 34,
    borderRadius: 6,
    border: active ? '1px solid #8a1414' : '1px solid #2a2a2e',
    background: active ? '#8a1414' : 'transparent',
    color: '#f5f5f5',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  };
}

export default function BillsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'airtime' | 'data'>('airtime');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Airtime state
  const [airtimeNetwork, setAirtimeNetwork] = useState('mtn');
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [buyingAirtime, setBuyingAirtime] = useState(false);

  // Data state
  const [dataNetwork, setDataNetwork] = useState('mtn-data');
  const [dataPhone, setDataPhone] = useState('');
  const [variations, setVariations] = useState<DataVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<DataVariation | null>(null);
  const [buyingData, setBuyingData] = useState(false);

  if (!requireAuth(router)) return null;

  async function loadVariations(network: string) {
    setDataNetwork(network);
    setSelectedVariation(null);
    setLoadingVariations(true);
    setError(null);
    try {
      const data = await api(`/bills/data-variations?serviceId=${network}`);
      setVariations(data.content?.variations ?? []);
    } catch (e: any) {
      setError(e.message);
      setVariations([]);
    } finally {
      setLoadingVariations(false);
    }
  }

  async function buyAirtime() {
    const parsed = Number(airtimeAmount);
    if (!airtimePhone || airtimePhone.length !== 11) {
      setError('Enter a valid 11-digit phone number');
      return;
    }
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setBuyingAirtime(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api('/bills/airtime', {
        method: 'POST',
        body: JSON.stringify({ serviceId: airtimeNetwork, phone: airtimePhone, amount: parsed }),
      });
      setSuccess(`Airtime purchase ${result.status === 'COMPLETED' ? 'successful' : 'submitted'} — ref ${result.requestId}`);
      setAirtimeAmount('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuyingAirtime(false);
    }
  }

  async function buyData() {
    if (!dataPhone || dataPhone.length !== 11) {
      setError('Enter a valid 11-digit phone number');
      return;
    }
    if (!selectedVariation) {
      setError('Choose a data plan');
      return;
    }
    setBuyingData(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api('/bills/data', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: dataNetwork,
          phone: dataPhone,
          variationCode: selectedVariation.variation_code,
          amount: Number(selectedVariation.variation_amount),
        }),
      });
      setSuccess(`Data purchase ${result.status === 'COMPLETED' ? 'successful' : 'submitted'} — ref ${result.requestId}`);
      setSelectedVariation(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuyingData(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Airtime/Data</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Top up airtime or buy a data bundle for MTN, Glo, Airtel, or 9mobile.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => { setTab('airtime'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'airtime')}>
          Airtime
        </button>
        <button onClick={() => { setTab('data'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'data')}>
          Data
        </button>
      </div>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}
      {success && <p style={{ color: '#34c471', fontSize: 13, marginBottom: 16 }}>{success}</p>}

      {tab === 'airtime' && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Network</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {AIRTIME_NETWORKS.map((n) => (
              <button key={n.serviceId} onClick={() => setAirtimeNetwork(n.serviceId)} style={networkChipStyle(airtimeNetwork === n.serviceId)}>
                {n.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Phone number</label>
          <input
            type="text"
            maxLength={11}
            placeholder="08011111111"
            value={airtimePhone}
            onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Amount</label>
          <input
            type="number"
            placeholder="Amount"
            value={airtimeAmount}
            onChange={(e) => setAirtimeAmount(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={buyAirtime}
            disabled={buyingAirtime}
            style={{ width: '100%', height: 38, borderRadius: 8, border: 'none', background: '#8a1414', color: '#fff', fontWeight: 500, cursor: buyingAirtime ? 'default' : 'pointer', opacity: buyingAirtime ? 0.7 : 1 }}
          >
            {buyingAirtime ? 'Buying…' : 'Buy airtime'}
          </button>
        </div>
      )}

      {tab === 'data' && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Network</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {DATA_NETWORKS.map((n) => (
              <button key={n.serviceId} onClick={() => loadVariations(n.serviceId)} style={networkChipStyle(dataNetwork === n.serviceId)}>
                {n.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Phone number</label>
          <input
            type="text"
            maxLength={11}
            placeholder="08011111111"
            value={dataPhone}
            onChange={(e) => setDataPhone(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Data plan</label>
          {loadingVariations && <p style={{ fontSize: 12, color: '#9a9a9f', marginBottom: 10 }}>Loading plans…</p>}
          {!loadingVariations && variations.length === 0 && (
            <p style={{ fontSize: 12, color: '#9a9a9f', marginBottom: 10 }}>Select a network to load plans.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, maxHeight: 220, overflowY: 'auto' }}>
            {variations.map((v) => (
              <button
                key={v.variation_code}
                onClick={() => setSelectedVariation(v)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: selectedVariation?.variation_code === v.variation_code ? '1px solid #8a1414' : '1px solid #2a2a2e',
                  background: selectedVariation?.variation_code === v.variation_code ? 'rgba(138,20,20,0.15)' : 'transparent',
                  color: '#f5f5f5',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{v.name}</span>
                <span style={{ fontWeight: 600 }}>₦{v.variation_amount}</span>
              </button>
            ))}
          </div>

          <button
            onClick={buyData}
            disabled={buyingData || !selectedVariation}
            style={{ width: '100%', height: 38, borderRadius: 8, border: 'none', background: '#8a1414', color: '#fff', fontWeight: 500, cursor: buyingData ? 'default' : 'pointer', opacity: buyingData || !selectedVariation ? 0.7 : 1 }}
          >
            {buyingData ? 'Buying…' : 'Buy data'}
          </button>
        </div>
      )}
    </main>
  );
}
