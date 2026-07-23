'use client';
// Airtime/Data purchase. Airtime uses a free-form amount; data plans are
// fixed-price and must be picked from VTpass's variation list for the
// chosen network — fetched fresh each time since prices/availability can
// change (see GET /bills/data-variations on the backend).
import { useState, useEffect } from 'react';
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

const ELECTRICITY_DISCOS = [
  { serviceId: 'ikeja-electric', label: 'Ikeja Electric' },
  { serviceId: 'eko-electric', label: 'Eko Electric' },
  { serviceId: 'abuja-electric', label: 'Abuja Electric' },
  { serviceId: 'kano-electric', label: 'Kano Electric' },
  { serviceId: 'ph-electric', label: 'Port Harcourt Electric' },
];

const EDUCATION_SERVICES = [
  { serviceId: 'waec', label: 'WAEC' },
  { serviceId: 'jamb', label: 'JAMB' },
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
    borderRadius: 8,
    border: 'none',
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--accent)' : 'rgba(255,255,255,0.85)',
    fontWeight: active ? 600 : 400,
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
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'airtime' | 'data' | 'electricity' | 'education'>('airtime');
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

  // Electricity state
  const [elecDisco, setElecDisco] = useState('ikeja-electric');
  const [elecMeterNumber, setElecMeterNumber] = useState('');
  const [elecMeterType, setElecMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [elecPhone, setElecPhone] = useState('');
  const [elecAmount, setElecAmount] = useState('');
  const [meterCustomerName, setMeterCustomerName] = useState<string | null>(null);
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [buyingElectricity, setBuyingElectricity] = useState(false);

  // Education state
  const [eduService, setEduService] = useState('waec');
  const [eduVariations, setEduVariations] = useState<DataVariation[]>([]);
  const [loadingEduVariations, setLoadingEduVariations] = useState(false);
  const [selectedEduVariation, setSelectedEduVariation] = useState<DataVariation | null>(null);
  const [eduBillersCode, setEduBillersCode] = useState('');
  const [eduProfileName, setEduProfileName] = useState<string | null>(null);
  const [verifyingEduProfile, setVerifyingEduProfile] = useState(false);
  const [eduPhone, setEduPhone] = useState('');
  const [buyingEducation, setBuyingEducation] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
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

  // ---------- Electricity ----------
  async function verifyMeter() {
    if (!elecMeterNumber) {
      setError('Enter a meter number');
      return;
    }
    setVerifyingMeter(true);
    setError(null);
    setMeterCustomerName(null);
    try {
      const result = await api('/bills/electricity/verify-meter', {
        method: 'POST',
        body: JSON.stringify({ serviceId: elecDisco, billersCode: elecMeterNumber, meterType: elecMeterType }),
      });
      const name = result?.content?.Customer_Name ?? result?.content?.customerName ?? null;
      if (!name) {
        setError('Could not verify meter — check the meter number and try again');
        return;
      }
      setMeterCustomerName(name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifyingMeter(false);
    }
  }

  async function buyElectricity() {
    const parsed = Number(elecAmount);
    if (!meterCustomerName) {
      setError('Verify the meter number first');
      return;
    }
    if (!elecPhone || elecPhone.length !== 11) {
      setError('Enter a valid 11-digit phone number');
      return;
    }
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setBuyingElectricity(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api('/bills/electricity', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: elecDisco,
          billersCode: elecMeterNumber,
          meterType: elecMeterType,
          amount: parsed,
          phone: elecPhone,
        }),
      });
      setSuccess(`Electricity purchase ${result.status === 'COMPLETED' ? 'successful' : 'submitted'} — ref ${result.requestId}`);
      setElecAmount('');
      setMeterCustomerName(null);
      setElecMeterNumber('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuyingElectricity(false);
    }
  }

  // ---------- Education ----------
  async function loadEducationVariations(service: string) {
    setEduService(service);
    setSelectedEduVariation(null);
    setEduProfileName(null);
    setEduBillersCode('');
    setLoadingEduVariations(true);
    setError(null);
    try {
      const data = await api(`/bills/education-variations?serviceId=${service}`);
      setEduVariations(data.content?.variations ?? []);
    } catch (e: any) {
      setError(e.message);
      setEduVariations([]);
    } finally {
      setLoadingEduVariations(false);
    }
  }

  async function verifyEducationProfile() {
    if (!eduBillersCode) {
      setError('Enter your profile ID / PIN');
      return;
    }
    if (!selectedEduVariation) {
      setError('Choose a variation first');
      return;
    }
    setVerifyingEduProfile(true);
    setError(null);
    setEduProfileName(null);
    try {
      const result = await api('/bills/education/verify-profile', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: eduService,
          billersCode: eduBillersCode,
          variationCode: selectedEduVariation.variation_code,
        }),
      });
      const name = result?.content?.Customer_Name ?? result?.content?.customerName ?? 'Verified';
      setEduProfileName(name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifyingEduProfile(false);
    }
  }

  async function buyEducation() {
    if (!eduProfileName) {
      setError('Verify your profile first');
      return;
    }
    if (!eduPhone || eduPhone.length !== 11) {
      setError('Enter a valid 11-digit phone number');
      return;
    }
    if (!selectedEduVariation) {
      setError('Choose a variation');
      return;
    }
    setBuyingEducation(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api('/bills/education', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: eduService,
          billersCode: eduBillersCode,
          variationCode: selectedEduVariation.variation_code,
          amount: Number(selectedEduVariation.variation_amount),
          phone: eduPhone,
        }),
      });
      setSuccess(`Education purchase ${result.status === 'COMPLETED' ? 'successful' : 'submitted'} — ref ${result.requestId}`);
      setSelectedEduVariation(null);
      setEduProfileName(null);
      setEduBillersCode('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuyingEducation(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          borderRadius: 14,
          padding: '22px 24px',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, color: '#fff' }}>Airtime/Data/Bills</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '6px 0 0' }}>
          Airtime, data, electricity, and education bills — all in one place.
        </p>
      </div>

      <div
        style={{
          background: 'var(--accent)',
          borderRadius: 12,
          padding: 8,
          marginBottom: 20,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <button onClick={() => { setTab('airtime'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'airtime')}>
          Airtime
        </button>
        <button onClick={() => { setTab('data'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'data')}>
          Data
        </button>
        <button onClick={() => { setTab('electricity'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'electricity')}>
          Electricity
        </button>
        <button onClick={() => { setTab('education'); setError(null); setSuccess(null); }} style={tabStyle(tab === 'education')}>
          Education
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

      {tab === 'electricity' && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Disco</label>
          <select
            value={elecDisco}
            onChange={(e) => { setElecDisco(e.target.value); setMeterCustomerName(null); }}
            style={inputStyle}
          >
            {ELECTRICITY_DISCOS.map((d) => (
              <option key={d.serviceId} value={d.serviceId}>{d.label}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Meter type</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <button onClick={() => { setElecMeterType('prepaid'); setMeterCustomerName(null); }} style={networkChipStyle(elecMeterType === 'prepaid')}>
              Prepaid
            </button>
            <button onClick={() => { setElecMeterType('postpaid'); setMeterCustomerName(null); }} style={networkChipStyle(elecMeterType === 'postpaid')}>
              Postpaid
            </button>
          </div>

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Meter number</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <input
              type="text"
              placeholder="Meter number"
              value={elecMeterNumber}
              onChange={(e) => { setElecMeterNumber(e.target.value); setMeterCustomerName(null); }}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button
              onClick={verifyMeter}
              disabled={verifyingMeter || !elecMeterNumber}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #2a2a2e', background: 'transparent', color: '#f5f5f5', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {verifyingMeter ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {meterCustomerName && (
            <p style={{ fontSize: 12, color: '#34c471', margin: '6px 0 10px' }}>Customer: {meterCustomerName}</p>
          )}
          {!meterCustomerName && <div style={{ marginBottom: 10 }} />}

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Phone number</label>
          <input
            type="text"
            maxLength={11}
            placeholder="08011111111"
            value={elecPhone}
            onChange={(e) => setElecPhone(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Amount</label>
          <input
            type="number"
            placeholder="Amount"
            value={elecAmount}
            onChange={(e) => setElecAmount(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={buyElectricity}
            disabled={buyingElectricity || !meterCustomerName}
            style={{ width: '100%', height: 38, borderRadius: 8, border: 'none', background: '#8a1414', color: '#fff', fontWeight: 500, cursor: buyingElectricity ? 'default' : 'pointer', opacity: buyingElectricity || !meterCustomerName ? 0.7 : 1 }}
          >
            {buyingElectricity ? 'Buying…' : 'Pay electricity bill'}
          </button>
        </div>
      )}

      {tab === 'education' && (
        <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Service</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {EDUCATION_SERVICES.map((s) => (
              <button key={s.serviceId} onClick={() => loadEducationVariations(s.serviceId)} style={networkChipStyle(eduService === s.serviceId)}>
                {s.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 6 }}>Variation</label>
          {loadingEduVariations && <p style={{ fontSize: 12, color: '#9a9a9f', marginBottom: 10 }}>Loading options…</p>}
          {!loadingEduVariations && eduVariations.length === 0 && (
            <p style={{ fontSize: 12, color: '#9a9a9f', marginBottom: 10 }}>Select a service to load options.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, maxHeight: 180, overflowY: 'auto' }}>
            {eduVariations.map((v) => (
              <button
                key={v.variation_code}
                onClick={() => { setSelectedEduVariation(v); setEduProfileName(null); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: selectedEduVariation?.variation_code === v.variation_code ? '1px solid #8a1414' : '1px solid #2a2a2e',
                  background: selectedEduVariation?.variation_code === v.variation_code ? 'rgba(138,20,20,0.15)' : 'transparent',
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

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Profile ID / PIN</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <input
              type="text"
              placeholder="Profile ID or PIN"
              value={eduBillersCode}
              onChange={(e) => { setEduBillersCode(e.target.value); setEduProfileName(null); }}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button
              onClick={verifyEducationProfile}
              disabled={verifyingEduProfile || !eduBillersCode || !selectedEduVariation}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #2a2a2e', background: 'transparent', color: '#f5f5f5', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {verifyingEduProfile ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {eduProfileName && (
            <p style={{ fontSize: 12, color: '#34c471', margin: '6px 0 10px' }}>Verified: {eduProfileName}</p>
          )}
          {!eduProfileName && <div style={{ marginBottom: 10 }} />}

          <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Phone number</label>
          <input
            type="text"
            maxLength={11}
            placeholder="08011111111"
            value={eduPhone}
            onChange={(e) => setEduPhone(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />

          <button
            onClick={buyEducation}
            disabled={buyingEducation || !eduProfileName}
            style={{ width: '100%', height: 38, borderRadius: 8, border: 'none', background: '#8a1414', color: '#fff', fontWeight: 500, cursor: buyingEducation ? 'default' : 'pointer', opacity: buyingEducation || !eduProfileName ? 0.7 : 1 }}
          >
            {buyingEducation ? 'Buying…' : 'Pay education bill'}
          </button>
        </div>
      )}
    </main>
  );
}
