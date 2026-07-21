'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const HERO_SLIDES = [
  { image: '/images/signup-hero-1.jpg', caption: 'Monitor Your Money like a Boss with Trecco' },
  { image: '/images/signup-hero-2.jpg', caption: 'Fund, save, and track every transaction in one place' },
];

function Eye({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Signup failed');
      }
      const data = await res.json();
      saveSession(data.accessToken, data.member.role, data.member.cooperativeId);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="auth-photo-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#1f1f23' }}>
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.image}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(180deg, rgba(11,11,13,0.15) 0%, rgba(11,11,13,0.9) 100%), url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === slideIndex ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }}
          />
        ))}

        <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
            {HERO_SLIDES[slideIndex].caption}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: '10px 0 0' }}>
            Join a cooperative or start your own &mdash; Tremma Agro Limited
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {HERO_SLIDES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: i === slideIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <img src="/logo-icon.png" alt="Trecco" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>Trecco</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>Let's get you started with Trecco</h1>
          <p style={{ fontSize: 13, color: '#9a9a9f', margin: '0 0 24px' }}>
            Create your account to get started
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, color: '#9a9a9f' }}>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, color: '#9a9a9f' }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 13, color: '#9a9a9f' }}>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, color: '#9a9a9f' }}>
              Password
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 12,
                    background: 'transparent',
                    border: 'none',
                    color: '#6b6b6b',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ display: 'block', fontSize: 11, color: '#6b6b6b', marginTop: 4 }}>
                At least 8 characters
              </span>
            </label>
            <label style={{ fontSize: 13, color: '#9a9a9f' }}>
              Confirm password
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 12,
                    background: 'transparent',
                    border: 'none',
                    color: '#6b6b6b',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {error && <p style={{ color: '#e5484d', fontSize: 13, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                height: 40,
                borderRadius: 8,
                border: 'none',
                background: '#8a1414',
                color: '#fff',
                fontWeight: 500,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: '#9a9a9f', marginTop: 20, textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#e5484d', textDecoration: 'none', fontWeight: 500 }}>
              Log in
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .auth-photo-panel {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  height: 36,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#1f1f23',
  color: '#f5f5f5',
  padding: '0 10px',
  boxSizing: 'border-box',
};
