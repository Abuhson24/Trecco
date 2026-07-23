'use client';
// Root route has no content of its own — it just routes the visitor
// to the right place based on whether they're logged in and what role
// they have. No token -> /login. Admin roles -> /admin/cards (their most
// common starting point right now). Everyone else -> /wallet.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '../lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const role = getRole();
    router.push('/dashboard');
  }, []);

  return null;
}
