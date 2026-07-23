'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, requireAuth } from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  address: string | null;
  imageUrl: string | null;
}

async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  padding: '0 12px',
  boxSizing: 'border-box',
  marginTop: 4,
  fontSize: 14,
};

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 14 };

const primaryButton: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 500,
  fontSize: 14,
  padding: '0 20px',
  cursor: 'pointer',
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const data = await api('/settings/profile');
      setProfile(data);
      setFullName(data.fullName);
      setAddress(data.address ?? '');
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, address }),
      });
      setSuccess(true);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('image', file);
      await api('/settings/profile/image', { method: 'POST', body });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!profile) {
    return <main style={{ padding: 24, color: 'var(--text-muted)' }}>{error ?? 'Loading…'}</main>;
  }

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <a href="/settings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>‹ Settings</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '8px 0 20px' }}>Profile</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: profile.imageUrl ? `url(${API_BASE}${profile.imageUrl})` : 'var(--surface-raised)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        />
        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} style={{ display: 'none' }} id="profile-image-input" />
          <label
            htmlFor="profile-image-input"
            style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </label>
        </div>
      </div>

      <label style={labelStyle}>
        Full name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
      </label>

      <label style={labelStyle}>
        Email <span style={{ color: 'var(--text-muted)' }}>(cannot be changed)</span>
        <input value={profile.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
      </label>

      <label style={labelStyle}>
        Phone <span style={{ color: 'var(--text-muted)' }}>(cannot be changed)</span>
        <input value={profile.phone} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
      </label>

      <label style={labelStyle}>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
      </label>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {success && <p style={{ color: '#34c471', fontSize: 13, marginBottom: 12 }}>Profile updated.</p>}

      <button onClick={save} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </main>
  );
}
