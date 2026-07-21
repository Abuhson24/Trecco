'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireCooperative } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Summary {
  wallet: { personalBalance: number; cooperativeSavings: number };
  cooperative: { id: string; name: string; status: string; activeMemberCount: number };
  loans: { activeCount: number; totalDisbursed: number; totalOutstanding: number };
  inventory: { itemCount: number; totalEstimatedValue: number };
  marketplace: { openDemandCount: number; myPendingOfferCount: number };
}

function money(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px' }}>{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <main style={{ padding: 24 }}><p style={{ color: 'var(--danger)' }}>{error}</p></main>;
  if (!summary) return <main style={{ padding: 24, color: 'var(--text-muted)' }}>Loading dashboard…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
        {summary.cooperative.name}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
        {summary.cooperative.status === 'RECRUITING' ? 'Growing — recruiting members' : 'Established cooperative'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card title="Your wallet">
          <Stat label="personal balance" value={money(summary.wallet.personalBalance)} />
          <Stat label="cooperative savings" value={money(summary.wallet.cooperativeSavings)} />
        </Card>

        <Card title="Membership">
          <Stat label="active members" value={summary.cooperative.activeMemberCount} />
        </Card>

        <Card title="Loans">
          <Stat label="active loans" value={summary.loans.activeCount} />
          <Stat label="total disbursed" value={money(summary.loans.totalDisbursed)} />
          <Stat label="outstanding" value={money(summary.loans.totalOutstanding)} />
        </Card>

        <Card title="Inventory">
          <Stat label="items listed" value={summary.inventory.itemCount} />
          <Stat label="estimated value" value={money(summary.inventory.totalEstimatedValue)} />
        </Card>

        <Card title="Marketplace">
          <Stat label="open demands" value={summary.marketplace.openDemandCount} />
          <Stat label="your pending offers" value={summary.marketplace.myPendingOfferCount} />
        </Card>
      </div>
    </main>
  );
}
