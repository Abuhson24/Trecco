'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireCooperative } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface LoanVote {
  id: string;
  approve: boolean;
}

interface LoanRepayment {
  id: string;
  method: 'AUTOMATED' | 'MANUAL';
  amount: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  rejectionReason: string | null;
  submittedAt: string;
}

interface Loan {
  id: string;
  amountRequested: string;
  amountApproved: string | null;
  amountRepaid: string;
  interestRate: string;
  purpose: string;
  repaymentMonths: number;
  status: string;
  submittedAt: string;
  disbursedAt: string | null;
  votes: LoanVote[];
  repayments: LoanRepayment[];
}

interface CreditScoreData {
  savingsScore: number;
  walletScore: number;
  inventoryScore: number;
  marketScore: number;
  punctualityScore: number;
  totalScore: number;
  rating: string;
  loanDecision: string;
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
  return `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// Simplified to three consistent buckets a member actually cares about:
// "Loan in progress" (still moving through review/disbursement),
// "Loan due" (disbursed, actively being repaid, money owed now),
// "Loan paid" (fully closed). REJECTED stays separate since it's a
// distinct negative outcome, not part of the three-bucket flow.
// Keep this exact wording anywhere else a loan status is shown
// (dashboard summaries, admin views) so the terminology never drifts.
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Loan in progress', color: '#5b9bd5' },
  COMMITTEE_VOTING: { label: 'Loan in progress', color: '#5b9bd5' },
  ADMIN_APPROVAL: { label: 'Loan in progress', color: '#5b9bd5' },
  APPROVED: { label: 'Loan in progress', color: '#5b9bd5' },
  DISBURSED: { label: 'Loan in progress', color: '#5b9bd5' },
  REPAYING: { label: 'Loan due', color: '#e0a020' },
  CLOSED: { label: 'Loan paid', color: '#34c471' },
  REJECTED: { label: 'Rejected', color: '#e5484d' },
};

export default function MyLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amountRequested: '', purpose: '', repaymentMonths: '6' });

  const [repayOpenId, setRepayOpenId] = useState<string | null>(null);
  const [repayMethod, setRepayMethod] = useState<'AUTOMATED' | 'MANUAL'>('AUTOMATED');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayReference, setRepayReference] = useState('');
  const [repayFile, setRepayFile] = useState<File | null>(null);
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  const [creditScore, setCreditScore] = useState<CreditScoreData | null>(null);
  const [creditScoreError, setCreditScoreError] = useState<string | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  async function load() {
    try {
      setLoans(await api('/loans/my-loans'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadCreditScore() {
    try {
      setCreditScore(await api('/loans/credit-score'));
      setCreditScoreError(null);
    } catch (e: any) {
      setCreditScore(null);
      setCreditScoreError(e.message);
    }
  }

  useEffect(() => {
    if (!requireCooperative(router)) return;
    load();
    loadCreditScore();
  }, []);

  async function submitLoanRequest() {
    if (!form.amountRequested || !form.purpose || !form.repaymentMonths) {
      setError('Amount, purpose, and repayment period are all required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/loans/request', {
        method: 'POST',
        body: JSON.stringify({
          amountRequested: Number(form.amountRequested),
          purpose: form.purpose,
          repaymentMonths: Number(form.repaymentMonths),
        }),
      });
      setForm({ amountRequested: '', purpose: '', repaymentMonths: '6' });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function openRepay(loanId: string) {
    setRepayOpenId(repayOpenId === loanId ? null : loanId);
    setRepayMethod('AUTOMATED');
    setRepayAmount('');
    setRepayReference('');
    setRepayFile(null);
  }

  async function submitRepayment(loanId: string) {
    const amount = Number(repayAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid repayment amount');
      return;
    }
    if (repayMethod === 'MANUAL' && !repayFile) {
      setError('A receipt is required for a manual repayment');
      return;
    }
    setRepaySubmitting(true);
    setError(null);
    try {
      if (repayMethod === 'AUTOMATED') {
        await api(`/loans/${loanId}/repay/automated`, {
          method: 'POST',
          body: JSON.stringify({ amount }),
        });
      } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('trecco_token') : null;
        const body = new FormData();
        body.append('amount', String(amount));
        if (repayReference) body.append('reference', repayReference);
        body.append('receipt', repayFile as File);
        const res = await fetch(`${API_BASE}/loans/${loanId}/repay/manual`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body,
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
      }
      setRepayOpenId(null);
      setRepayAmount('');
      setRepayReference('');
      setRepayFile(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRepaySubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
          background: '#1f1f23',
        }}
      >
        <img
          src="/trecco-loan-hero.jpeg"
          alt="Trecco Loan"
          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(11,11,13,0) 40%, rgba(11,11,13,0.92) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '20px 24px',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#fff' }}>My Loans</h1>
          <p style={{ fontSize: 13, color: '#e5e5e5', margin: '4px 0 0' }}>
            Get the support you need to grow your business.
          </p>
        </div>
      </div>

      {creditScore && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Trecco Credit Score</p>
              <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{creditScore.totalScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/1000</span></p>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 999,
                background:
                  creditScore.rating === 'AAA' || creditScore.rating === 'AA'
                    ? 'rgba(52,196,113,0.15)'
                    : creditScore.rating === 'A'
                    ? 'rgba(91,155,213,0.15)'
                    : creditScore.rating === 'BBB' || creditScore.rating === 'BB'
                    ? 'rgba(224,160,32,0.15)'
                    : 'rgba(229,72,77,0.15)',
                color:
                  creditScore.rating === 'AAA' || creditScore.rating === 'AA'
                    ? '#34c471'
                    : creditScore.rating === 'A'
                    ? '#5b9bd5'
                    : creditScore.rating === 'BBB' || creditScore.rating === 'BB'
                    ? '#e0a020'
                    : '#e5484d',
              }}
            >
              {creditScore.rating}
            </span>
          </div>

          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#c4c4c8' }}>{creditScore.loanDecision}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#6b6b6b' }}>Savings</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{creditScore.savingsScore}/300</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#6b6b6b' }}>Wallet activity</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{creditScore.walletScore}/200</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#6b6b6b' }}>Inventory</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{creditScore.inventoryScore}/200</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#6b6b6b' }}>Marketplace</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{creditScore.marketScore}/200</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#6b6b6b' }}>Punctuality</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{creditScore.punctualityScore}/100</p>
            </div>
          </div>
        </div>
      )}

      {creditScoreError && !creditScore && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#9a9a9f' }}>{creditScoreError}</p>
        </div>
      )}

      <button
        onClick={() => setShowScoreInfo(!showScoreInfo)}
        style={{ background: 'none', border: 'none', color: '#9a9a9f', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: showScoreInfo ? 10 : 20, textDecoration: 'underline' }}
      >
        {showScoreInfo ? 'Hide' : 'How is my score calculated?'}
      </button>

      {showScoreInfo && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>Trecco Credit Score (0–1000)</p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9a9a9f' }}>
            Your score is built from five things Trecco already tracks for you — not collateral or a bank credit history.
          </p>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Cooperative savings</span>
              <span style={{ color: '#9a9a9f' }}>300 pts (30%)</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              How close your savings balance is to the cooperative's recommended target.
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Wallet activity</span>
              <span style={{ color: '#9a9a9f' }}>200 pts (20%)</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              How often you use your wallet — deposits, withdrawals, transfers, and payments over the last 6 months.
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Inventory value</span>
              <span style={{ color: '#9a9a9f' }}>200 pts (20%)</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              The current value of the produce, seeds, or equipment you have listed in stock.
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Marketplace performance</span>
              <span style={{ color: '#9a9a9f' }}>200 pts (20%)</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              How many buyer offers you've completed successfully in the last 6 months, plus repeat buyers.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Savings punctuality</span>
              <span style={{ color: '#9a9a9f' }}>100 pts (10%)</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              How many of the last 6 months you saved something, plus a bonus for consecutive months.
            </p>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
            What your rating means
          </p>
          <div style={{ fontSize: 11, color: '#9a9a9f', lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}><span style={{ color: '#34c471', fontWeight: 600 }}>AAA (900–1000)</span> — Premium borrower; lowest interest and highest limits</p>
            <p style={{ margin: 0 }}><span style={{ color: '#34c471', fontWeight: 600 }}>AA (800–899)</span> — Excellent; fast approval</p>
            <p style={{ margin: 0 }}><span style={{ color: '#5b9bd5', fontWeight: 600 }}>A (700–799)</span> — Good; standard approval</p>
            <p style={{ margin: 0 }}><span style={{ color: '#e0a020', fontWeight: 600 }}>BBB (600–699)</span> — Fair; reduced amount or guarantor may be required</p>
            <p style={{ margin: 0 }}><span style={{ color: '#e0a020', fontWeight: 600 }}>BB (500–599)</span> — Moderate risk; smaller loans only</p>
            <p style={{ margin: 0 }}><span style={{ color: '#e5484d', fontWeight: 600 }}>B (400–499)</span> — High risk; improvement plan recommended</p>
            <p style={{ margin: 0 }}><span style={{ color: '#e5484d', fontWeight: 600 }}>Below 400 (C)</span> — Not currently eligible; keep saving and stay active on the platform</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <button
          onClick={loadCreditScore}
          style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          Credit Score
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Request Loan'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Track your loan requests from committee review through repayment.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Amount requested (₦)</label>
            <input
              type="number"
              placeholder="50000"
              value={form.amountRequested}
              onChange={(e) => setForm({ ...form, amountRequested: e.target.value })}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Purpose</label>
            <textarea
              placeholder="What is this loan for?"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              rows={3}
              style={{ ...inputStyle, width: '100%', height: 'auto', padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Repayment period (months)</label>
            <input
              type="number"
              placeholder="6"
              value={form.repaymentMonths}
              onChange={(e) => setForm({ ...form, repaymentMonths: e.target.value })}
              style={{ ...inputStyle, width: 120, boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={submitLoanRequest}
            disabled={saving}
            style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      )}

      {loans.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>No loans requested yet.</p>
      )}

      {loans.map((loan) => {
        const statusInfo = STATUS_LABELS[loan.status] ?? { label: loan.status, color: '#9a9a9f' };
        const approveVotes = loan.votes.filter((v) => v.approve).length;
        const rejectVotes = loan.votes.filter((v) => !v.approve).length;
        const outstanding = loan.amountApproved
          ? Math.max(0, Number(loan.amountApproved) - Number(loan.amountRepaid))
          : null;

        return (
          <div key={loan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{formatNaira(loan.amountRequested)} requested</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f', maxWidth: 480 }}>{loan.purpose}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b6b6b' }}>
                  {loan.repaymentMonths} month{loan.repaymentMonths === 1 ? '' : 's'} · {Number(loan.interestRate)}% interest
                  {loan.status === 'COMMITTEE_VOTING' && ` · ${approveVotes} approve / ${rejectVotes} reject`}
                </p>
              </div>
              <span style={{ fontSize: 12, color: statusInfo.color, whiteSpace: 'nowrap' }}>{statusInfo.label}</span>
            </div>

            {loan.amountApproved && (
              <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9a9a9f' }}>Approved</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{formatNaira(loan.amountApproved)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9a9a9f' }}>Repaid</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{formatNaira(loan.amountRepaid)}</p>
                </div>
                {outstanding !== null && (
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: '#9a9a9f' }}>Outstanding</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500 }}>{formatNaira(outstanding)}</p>
                  </div>
                )}
              </div>
            )}

            {loan.repayments.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9a9a9f' }}>Repayment history</p>
                {loan.repayments.map((r) => (
                  <p key={r.id} style={{ margin: '2px 0', fontSize: 12, color: '#c4c4c8' }}>
                    {formatNaira(r.amount)} · {r.method === 'AUTOMATED' ? 'Automated' : 'Manual'} ·{' '}
                    <span style={{ color: r.status === 'CONFIRMED' ? '#34c471' : r.status === 'REJECTED' ? '#e5484d' : '#e0a020' }}>
                      {r.status === 'CONFIRMED' ? 'Confirmed' : r.status === 'REJECTED' ? 'Rejected' : 'Pending review'}
                    </span>
                    {r.status === 'REJECTED' && r.rejectionReason ? ` — ${r.rejectionReason}` : ''}
                  </p>
                ))}
              </div>
            )}

            {loan.status === 'REPAYING' && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2e' }}>
                <button
                  onClick={() => openRepay(loan.id)}
                  style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                >
                  {repayOpenId === loan.id ? 'Cancel' : 'Make a repayment'}
                </button>

                {repayOpenId === loan.id && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button
                        onClick={() => setRepayMethod('AUTOMATED')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: repayMethod === 'AUTOMATED' ? '1px solid #8a1414' : '1px solid #2a2a2e',
                          background: repayMethod === 'AUTOMATED' ? 'rgba(138,20,20,0.15)' : 'transparent',
                          color: '#f5f5f5',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Automated (from wallet)
                      </button>
                      <button
                        onClick={() => setRepayMethod('MANUAL')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: repayMethod === 'MANUAL' ? '1px solid #8a1414' : '1px solid #2a2a2e',
                          background: repayMethod === 'MANUAL' ? 'rgba(138,20,20,0.15)' : 'transparent',
                          color: '#f5f5f5',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Manual (bank transfer)
                      </button>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Amount (₦)</label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {repayMethod === 'MANUAL' && (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <label style={labelStyle}>Bank reference (optional)</label>
                          <input
                            type="text"
                            placeholder="Teller/transaction reference"
                            value={repayReference}
                            onChange={(e) => setRepayReference(e.target.value)}
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={labelStyle}>Receipt (required)</label>
                          <label style={{ fontSize: 12, color: '#9a9a9f', cursor: 'pointer', border: '1px solid #2a2a2e', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>
                            {repayFile ? repayFile.name : 'Choose receipt image'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setRepayFile(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => submitRepayment(loan.id)}
                      disabled={repaySubmitting}
                      style={{ background: '#8a1414', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: repaySubmitting ? 'default' : 'pointer', opacity: repaySubmitting ? 0.7 : 1 }}
                    >
                      {repaySubmitting ? 'Submitting…' : 'Submit Repayment'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}
