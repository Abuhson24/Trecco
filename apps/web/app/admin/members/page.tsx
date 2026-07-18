'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Member {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isCommitteeMember: boolean;
  joinedAt: string;
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

const card = { background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 12 } as const;

function roleBadge(role: string) {
  const isAdmin = role === 'COOP_ADMIN' || role === 'TREMMA_SUPER_ADMIN';
  return {
    background: isAdmin ? 'rgba(138,20,20,0.2)' : '#2a2a2e',
    color: isAdmin ? '#e5484d' : '#9a9a9f',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 500,
  };
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    try {
      setMembers(await api('/cooperative/members'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAdmin(router)) return;
    load();
  }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const adminCount = members.filter((m) => m.role === 'COOP_ADMIN' || m.role === 'TREMMA_SUPER_ADMIN').length;
  const committeeCount = members.filter((m) => m.isCommitteeMember).length;

  return (
    <main style={{ maxWidth: 780, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Members</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', margin: '4px 0 20px' }}>
        Everyone in your cooperative — {members.length} total, {adminCount} admin{adminCount === 1 ? '' : 's'},{' '}
        {committeeCount} on committee.
      </p>

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          height: 36,
          borderRadius: 8,
          border: '1px solid #2a2a2e',
          background: '#0b0b0d',
          color: '#f5f5f5',
          padding: '0 10px',
          boxSizing: 'border-box',
          fontSize: 13,
          marginBottom: 16,
        }}
      />

      {filtered.length === 0 && !error && (
        <p style={{ color: '#9a9a9f', fontSize: 13 }}>
          {members.length === 0 ? 'No members yet.' : 'No members match that search.'}
        </p>
      )}

      {filtered.map((m) => (
        <div key={m.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{m.fullName}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9a9a9f' }}>{m.email}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>
              Joined {new Date(m.joinedAt).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {m.isCommitteeMember && (
              <span style={{ background: 'rgba(52,196,113,0.15)', color: '#34c471', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                Committee
              </span>
            )}
            <span style={roleBadge(m.role)}>{m.role}</span>
          </div>
        </div>
      ))}
    </main>
  );
}
