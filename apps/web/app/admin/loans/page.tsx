'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Member {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isCommitteeMember: boolean;
}

interface LoanVote {
  id: string;
  approve: boolean;
}

interface LoanBase {
  id: string;
  amountRequested: string;
  purpose: string;
  repaymentMonths: number;
  interestRate: string;
  votes: LoanVote[];
  member: { id: string; fullName: string; email: string; phone: string };
}

interface PendingRepayment {
  id: string;
  amount: string;
  reference: string | null;
  receiptUrl: string | null;
  submittedAt: string;
  loan: { id: string; member: { id: string; fullName: string; email: string } };
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
const sectionTitle = { fontSize: 15, fontWeight: 600, margin: '28px 0 12px' } as const;
const smallBtn = (color: string) => ({
  background: 'transparent',
  border: `1px solid ${color}`,
  color,
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
}) as const;
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

export default function AdminLoansPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [committeePending, setCommitteePending] = useState<LoanBase[]>([]);
  const [adminPending, setAdminPending] = useState<LoanBase[]>([]);
  const [repayPending, setRepayPending] = useState<PendingRepayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approveAmounts, setApproveAmounts] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function loadAll() {
    // Non-admin committee members can legitimately load this page (backend
    // allows any isCommitteeMember=true member to vote, regardless of
    // role) but can't call the admin-only endpoints below. Each call gets
    // its own fallback so a 403 on one doesn't wipe out the whole page --
    // in particular, committee voting must still work for a non-admin.
    try {
      const [m, cp, ap, rp] = await Promise.all([
        api('/cooperative/members').catch(() => []),
        api('/loans/committee/pending').catch(() => []),
        api('/loans/admin/pending-approval').catch(() => []),
        api('/loans/admin/repayments/pending').catch(() => []),
      ]);
      setMembers(m);
      setCommitteePending(cp);
      setAdminPending(ap);
      setRepayPending(rp);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    loadAll();
  }, []);

  async function toggleCommittee(memberId: string, current: boolean) {
    setBusyId(memberId);
    setError(null);
    try {
      await api(`/loans/admin/committee/${memberId}`, {
        method: 'POST',
        body: JSON.stringify({ isCommitteeMember: !current }),
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, isCommitteeMember: !current } : m)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function castVote(loanId: string, approve: boolean) {
    setBusyId(loanId);
    setError(null);
    try {
      await api(`/loans/${loanId}/vote`, { method: 'POST', body: JSON.stringify({ approve }) });
      setCommitteePending((prev) => prev.filter((l) => l.id !== loanId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function approveLoan(loanId: string) {
    setBusyId(loanId);
    setError(null);
    try {
      const amountStr = approveAmounts[loanId];
      const body = amountStr ? { amountApproved: Number(amountStr) } : {};
      await api(`/loans/admin/${loanId}/approve`, { method: 'POST', body: JSON.stringify(body) });
      setAdminPending((prev) => prev.filter((l) => l.id !== loanId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function rejectLoan(loanId: string) {
    setBusyId(loanId);
    setError(null);
    try {
      await api(`/loans/admin/${loanId}/reject`, { method: 'POST' });
      setAdminPending((prev) => prev.filter((l) => l.id !== loanId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRepayment(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/loans/admin/repayments/${id}/confirm`, { method: 'POST' });
      setRepayPending((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function rejectRepayment(id: string) {
    const reason = rejectReasons[id]?.trim();
    if (!reason) {
      setError('Enter a reason for rejection');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api(`/loans/admin/repayments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      setRepayPending((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
      setRejectingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Loan Administration</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', margin: '4px 0 0' }}>
        Manage the loan committee, review votes, approve and disburse loans, and confirm repayments.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginTop: 16 }}>{error}</p>}

      <h2 style={sectionTitle}>Loan Committee</h2>
      <div style={card}>
        {members.length === 0 && <p style={{ color: '#9a9a9f', fontSize: 13, margin: 0 }}>No members found.</p>}
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #2a2a2e' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{m.fullName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9a9a9f' }}>{m.email} · {m.role}</p>
            </div>
            <button
              onClick={() => toggleCommittee(m.id, m.isCommitteeMember)}
              disabled={busyId === m.id}
              style={m.isCommitteeMember ? smallBtn('#34c471') : smallBtn('#9a9a9f')}
            >
              {busyId === m.id ? 'Working…' : m.isCommitteeMember ? 'On committee' : 'Add to committee'}
            </button>
          </div>
        ))}
      </div>

      <h2 style={sectionTitle}>Awaiting Your Vote</h2>
      {committeePending.length === 0 && <p style={{ color: '#9a9a9f', fontSize: 13 }}>Nothing pending your vote right now.</p>}
      {committeePending.map((loan) => {
        const approveCount = loan.votes.filter((v) => v.approve).length;
        const rejectCount = loan.votes.filter((v) => !v.approve).length;
        return (
          <div key={loan.id} style={card}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{loan.member.fullName} — {formatNaira(loan.amountRequested)}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f', maxWidth: 500 }}>{loan.purpose}</p>
            <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#6b6b6b' }}>
              {loan.repaymentMonths} months · {Number(loan.interestRate)}% interest · {approveCount} approve / {rejectCount} reject so far
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => castVote(loan.id, true)} disabled={busyId === loan.id} style={primaryBtn}>
                {busyId === loan.id ? 'Working…' : 'Approve'}
              </button>
              <button onClick={() => castVote(loan.id, false)} disabled={busyId === loan.id} style={smallBtn('#e5484d')}>
                Reject
              </button>
            </div>
          </div>
        );
      })}

      <h2 style={sectionTitle}>Awaiting Admin Approval</h2>
      {adminPending.length === 0 && <p style={{ color: '#9a9a9f', fontSize: 13 }}>Nothing awaiting approval right now.</p>}
      {adminPending.map((loan) => {
        const approveCount = loan.votes.filter((v) => v.approve).length;
        const rejectCount = loan.votes.filter((v) => !v.approve).length;
        return (
          <div key={loan.id} style={card}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{loan.member.fullName} — {formatNaira(loan.amountRequested)} requested</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f', maxWidth: 500 }}>{loan.purpose}</p>
            <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#6b6b6b' }}>
              {loan.repaymentMonths} months · {Number(loan.interestRate)}% interest · Committee: {approveCount} approve / {rejectCount} reject
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                placeholder={`Amount (default ${loan.amountRequested})`}
                value={approveAmounts[loan.id] ?? ''}
                onChange={(e) => setApproveAmounts({ ...approveAmounts, [loan.id]: e.target.value })}
                style={{ height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px', fontSize: 13, width: 200 }}
              />
              <button onClick={() => approveLoan(loan.id)} disabled={busyId === loan.id} style={primaryBtn}>
                {busyId === loan.id ? 'Working…' : 'Approve & Disburse'}
              </button>
              <button onClick={() => rejectLoan(loan.id)} disabled={busyId === loan.id} style={smallBtn('#e5484d')}>
                Reject
              </button>
            </div>
          </div>
        );
      })}

      <h2 style={sectionTitle}>Manual Repayments Awaiting Confirmation</h2>
      {repayPending.length === 0 && <p style={{ color: '#9a9a9f', fontSize: 13 }}>No manual repayments pending review.</p>}
      {repayPending.map((r) => (
        <div key={r.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{r.loan.member.fullName} — {formatNaira(r.amount)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>
                {r.reference ? `Ref: ${r.reference}` : 'No reference given'} · Submitted {new Date(r.submittedAt).toLocaleDateString()}
              </p>
              {r.receiptUrl && (
                <a href={`${API_BASE}${r.receiptUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#5b9bd5' }}>
                  View receipt
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => confirmRepayment(r.id)} disabled={busyId === r.id} style={primaryBtn}>
              {busyId === r.id ? 'Working…' : 'Confirm'}
            </button>
            <button onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)} style={smallBtn('#e5484d')}>
              Reject
            </button>
          </div>
          {rejectingId === r.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                type="text"
                placeholder="Reason for rejection"
                value={rejectReasons[r.id] ?? ''}
                onChange={(e) => setRejectReasons({ ...rejectReasons, [r.id]: e.target.value })}
                style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a2a2e', background: '#0b0b0d', color: '#f5f5f5', padding: '0 10px', fontSize: 13 }}
              />
              <button onClick={() => rejectRepayment(r.id)} disabled={busyId === r.id} style={{ ...primaryBtn, background: '#e5484d' }}>
                Confirm reject
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
