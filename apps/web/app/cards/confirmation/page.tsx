'use client';
// Full-page confirmation shown right after a card request is submitted.
// Physical requests get the branded dispatch-rider photo; virtual requests
// get a simpler on-page message. Read via a query param so a fresh page
// load (not just client-side state) can still render the right message.
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CardConfirmationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const cardType = params.get('type') === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL';

  return (
    <main style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      {cardType === 'PHYSICAL' ? (
        <>
          <img
            src="/trecco-dispatch-rider.png"
            alt="Trecco dispatch rider"
            style={{
              width: '100%',
              maxWidth: 480,
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              marginBottom: 28,
            }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>
            We have received your request and your card is on the way!
          </h1>
          <p style={{ fontSize: 14, color: '#9a9a9f', margin: '0 0 28px' }}>
            One of our dispatch riders will be assigned once your card clears approval and issuance.
            We'll notify you the moment it's out for delivery.
          </p>
        </>
      ) : (
        <>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8a1414 0%, #e0a020 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
            }}
          >
            <svg width="56" height="56" viewBox="0 0 100 100">
              <rect x="15" y="28" width="70" height="44" rx="8" fill="#fff" opacity="0.9" />
              <rect x="15" y="40" width="70" height="8" fill="#8a1414" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>
            Your virtual card request has been received!
          </h1>
          <p style={{ fontSize: 14, color: '#9a9a9f', margin: '0 0 28px' }}>
            We'll notify you as soon as it's approved and ready to use.
          </p>
        </>
      )}

      <button
        onClick={() => router.push('/cards')}
        style={{
          background: '#8a1414',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Back to my cards
      </button>
    </main>
  );
}

export default function CardConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <CardConfirmationContent />
    </Suspense>
  );
}
