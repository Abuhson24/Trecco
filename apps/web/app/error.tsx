'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Something went wrong</h1>
      <p style={{ fontSize: 13, color: '#9a9a9f', marginBottom: 20 }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        style={{
          background: '#8a1414',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </main>
  );
}
