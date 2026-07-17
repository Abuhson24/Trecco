'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireCooperative } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface LoanVote {
  id: string;
  approve: boolean;
}

interface Loan {
  id: string;
  amountRequested: string;
  purpose: string;
  repaymentMonths: number;
  interestRate: string;
  votes: LoanVote[];
  member: { id: string; fullName: string; email: string; phone: string };
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

const card = { background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 } as const;
const primaryBtn = {
  background: '#8a1414',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
} as const;
const rejectBtn = {
  background: 'transparent',
  border: '1px solid #e5484d',
  color: '#e5484d',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
} as const;

export default function CommitteeVotingPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notCommittee, setNotCommittee] = useState(false);

  async function load() {
    try {
      setLoans(await api('/loans/committee/pending'));
      setError(null);
      setNotCommittee(false);
    } catch (e: any) {
      if (e.message?.toLowerCase().includes('not on the loan committee')) {
        setNotCommittee(true);
      } else {
        setError(e.message);
      }
    }
  }

  useEffect(() => {
    if (!requireCooperative(router)) return;
    load();
  }, []);

  async function castVote(loanId: string, approve: boolean) {
    setBusyId(loanId);
    setError(null);
    try {
      await api(`/loans/${loanId}/vote`, { method: 'POST', body: JSON.stringify({ approve }) });
      setLoans((prev) => prev.filter((l) => l.id !== loanId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Committee Voting</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        Loans from your cooperative awaiting your vote.
      </p>

      {notCommittee && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>
          You're not currently on the loan committee. Ask a cooperative admin to add you from the Admin - Loans page.
        </p>
      )}

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {!notCommittee && loans.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>Nothing pending your vote right now.</p>
      )}

      {loans.map((loan) => {
        const approveCount = loan.votes.filter((v) => v.approve).length;
        const rejectCount = loan.votes.filter((v) => !v.approve).length;
        return (
          <div key={loan.id} style={card}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
              {loan.member.fullName} — {formatNaira(loan.amountRequested)}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f', maxWidth: 500 }}>{loan.purpose}</p>
            <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#6b6b6b' }}>
              {loan.repaymentMonths} months · {Number(loan.interestRate)}% interest · {approveCount} approve / {rejectCount} reject so far
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => castVote(loan.id, true)} disabled={busyId === loan.id} style={primaryBtn}>
                {busyId === loan.id ? 'Working…' : 'Approve'}
              </button>
              <button onClick={() => castVote(loan.id, false)} disabled={busyId === loan.id} style={rejectBtn}>
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </main>
  );
}
