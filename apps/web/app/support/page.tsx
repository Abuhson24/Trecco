'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const SUPPORT_EMAIL = 'treccoapp@tremmaagrohub.com.ng';
const WHATSAPP_URL = 'https://wa.me/message/TNHG3R6T2EILE1';
const SUPPORT_PHONE = '+2348126317794';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const label: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' };
const value: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 };

const linkButton: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const outlineButton: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export default function SupportPage() {
  const router = useRouter();

  useEffect(() => {
    requireAuth(router);
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Customer Support</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
        Reach us any of these ways — WhatsApp is usually the fastest.
      </p>

      <div style={card}>
        <div>
          <p style={label}>WhatsApp</p>
          <p style={value}>Chat with support</p>
        </div>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={linkButton}>
          Open WhatsApp
        </a>
      </div>

      <div style={card}>
        <div>
          <p style={label}>Email</p>
          <p style={value}>{SUPPORT_EMAIL}</p>
        </div>
        <a href={`mailto:${SUPPORT_EMAIL}`} style={outlineButton}>
          Send email
        </a>
      </div>

      <div style={card}>
        <div>
          <p style={label}>Call line</p>
          <p style={value}>{SUPPORT_PHONE}</p>
        </div>
        <a href={`tel:${SUPPORT_PHONE}`} style={outlineButton}>
          Call now
        </a>
      </div>
    </main>
  );
}
