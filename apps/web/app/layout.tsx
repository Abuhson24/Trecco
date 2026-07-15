import type { ReactNode } from 'react';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Trecco',
  description: 'Cooperative savings, loans, and marketplace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0b0b0d',
          color: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          minHeight: '100vh',
        }}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
