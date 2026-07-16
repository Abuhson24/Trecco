// Parallel to lib/auth.ts, but for the offtaker identity — separate token
// key so an offtaker and a member session don't collide in the same browser.
const TOKEN_KEY = 'trecco_offtaker_token';

export function saveOfftakerSession(accessToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
}

export function getOfftakerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearOfftakerSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export function requireOfftakerAuth(router: { push: (path: string) => void }) {
  if (!getOfftakerToken()) {
    router.push('/offtaker/login');
    return false;
  }
  return true;
}
