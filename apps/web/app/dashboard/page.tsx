'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireCooperative } from '../../lib/auth';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Send, ArrowDownToLine, ShoppingCart, HandCoins } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Summary {
  wallet: { personalBalance: number; cooperativeSavings: number };
  cooperative: { id: string; name: string; status: string; activeMemberCount: number };
  loans: { activeCount: number; totalDisbursed: number; totalOutstanding: number };
  inventory: { itemCount: number; totalEstimatedValue: number };
  marketplace: { openDemandCount: number; myPendingOfferCount: number };
}

interface WalletFlowWeek {
  weekLabel: string;
  credit: number;
  debit: number;
  savings: number;
}

function money(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? 'var(--accent)' : 'var(--surface)',
        border: accent ? 'none' : '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <p style={{ fontSize: 13, color: accent ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', margin: '0 0 10px' }}>{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, light }: { label: string; value: string | number; light?: boolean }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 20, fontWeight: 600, color: light ? '#fff' : 'var(--text)' }}>{value}</span>
      <span style={{ fontSize: 12, color: light ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginLeft: 8 }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletFlow, setWalletFlow] = useState<WalletFlowWeek[] | null>(null);

  useEffect(() => {
    if (!requireCooperative(router)) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard/summary`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? 'Failed to load dashboard');
        }
        setSummary(await res.json());
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard/wallet-flow`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWalletFlow(data.weeks);
        }
      } catch {
        // Non-critical — dashboard still works without the chart.
      }
    })();
  }, []);

  if (error) return <main style={{ padding: 24 }}><p style={{ color: 'var(--danger)' }}>{error}</p></main>;
  if (!summary) return <main style={{ padding: 24, color: 'var(--text-muted)' }}>Loading dashboard…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          background: 'var(--accent)',
          borderRadius: 12,
          padding: '20px 24px',
          margin: '0 0 24px',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
          {summary.cooperative.name}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          {summary.cooperative.status === 'RECRUITING' ? 'Growing — recruiting members' : 'Established cooperative'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push('/wallet')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 8px', cursor: 'pointer', color: 'var(--text)' }}
        >
          <Send size={20} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Pay</span>
        </button>
        <button
          onClick={() => router.push('/wallet')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 8px', cursor: 'pointer', color: 'var(--text)' }}
        >
          <ArrowDownToLine size={20} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Receive</span>
        </button>
        <button
          onClick={() => router.push('/marketplace')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 8px', cursor: 'pointer', color: 'var(--text)' }}
        >
          <ShoppingCart size={20} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Buy Inputs</span>
        </button>
        <button
          onClick={() => router.push('/loans')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 8px', cursor: 'pointer', color: 'var(--text)' }}
        >
          <HandCoins size={20} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Request Loan</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card title="Your wallet" accent>
          <Stat label="personal balance" value={money(summary.wallet.personalBalance)} light />
          <Stat label="cooperative savings" value={money(summary.wallet.cooperativeSavings)} light />
        </Card>

        <Card title="Membership">
          <Stat label="active members" value={summary.cooperative.activeMemberCount} />
        </Card>

        <Card title="Loans" accent>
          <Stat label="active loans" value={summary.loans.activeCount} light />
          <Stat label="total disbursed" value={money(summary.loans.totalDisbursed)} light />
          <Stat label="outstanding" value={money(summary.loans.totalOutstanding)} light />
        </Card>

        <Card title="Inventory">
          <Stat label="items listed" value={summary.inventory.itemCount} />
          <Stat label="estimated value" value={money(summary.inventory.totalEstimatedValue)} />
        </Card>

        <Card title="Marketplace" accent>
          <Stat label="open demands" value={summary.marketplace.openDemandCount} light />
          <Stat label="your pending offers" value={summary.marketplace.myPendingOfferCount} light />
        </Card>
      </div>

      {walletFlow && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Wallet flow (last 8 weeks)</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={walletFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="weekLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => money(value)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="credit" name="Credit (in)" fill="#34c471" radius={[4, 4, 0, 0]} />
              <Bar dataKey="debit" name="Debit (out)" fill="#e5484d" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="savings" name="Savings" stroke="#5b9bd5" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </main>
  );
}
