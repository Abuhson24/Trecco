// Shared client-side auth helpers. Keep this the single source of truth for
// the localStorage key name and redirect behavior — /cards, /admin/cards,
// and the login page all import from here so they can't drift out of sync.

const TOKEN_KEY = 'trecco_token';
const ROLE_KEY = 'trecco_role';
const COOPERATIVE_ID_KEY = 'trecco_cooperative_id';

export function saveSession(accessToken: string, role: string, cooperativeId: string | null = null) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(ROLE_KEY, role);
  if (cooperativeId) {
    localStorage.setItem(COOPERATIVE_ID_KEY, cooperativeId);
  } else {
    localStorage.removeItem(COOPERATIVE_ID_KEY);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(COOPERATIVE_ID_KEY);
}

export function getCooperativeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(COOPERATIVE_ID_KEY);
}

// Call from a useEffect at the top of any protected page.
// Redirects to /login if there's no token.
export function requireAuth(router: { push: (path: string) => void }) {
  if (!getToken()) {
    router.push('/login');
    return false;
  }
  return true;
}

// Same, but also requires an admin-level role. Non-admins get bounced to /cards
// rather than /login, since they ARE authenticated, just not authorized here.
export function requireAdmin(router: { push: (path: string) => void }) {
  if (!requireAuth(router)) return false;
  const role = getRole();
  if (role !== 'COOP_ADMIN' && role !== 'TREMMA_SUPER_ADMIN') {
    router.push('/cards');
    return false;
  }
  return true;
}

// Same, but also requires cooperative membership. A signed-in member with
// no cooperative (e.g. navigating here directly via bookmark/back button)
// gets sent to /onboarding instead of hitting a page that assumes one exists.
export function requireCooperative(router: { push: (path: string) => void }) {
  if (!requireAuth(router)) return false;
  if (!getCooperativeId()) {
    router.push('/onboarding');
    return false;
  }
  return true;
}
