import type { ReactNode } from 'react';
import Nav from '../components/Nav';
import { ThemeProvider } from '../lib/theme';
import './globals.css';

export const metadata = {
  title: 'Trecco',
  description: 'Cooperative savings, loans, and marketplace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
