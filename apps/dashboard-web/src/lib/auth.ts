const TOKEN_KEY = 'sb_token';

/** Read the JWT from cookie (client-side only). */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + TOKEN_KEY + '=([^;]*)'));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

/** Persist the JWT in a cookie for 7 days. */
export function setToken(token: string): void {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Strict`;
}

/** Clear the JWT cookie (logout). */
export function clearToken(): void {
  document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/** Decode the JWT payload without verification (for display only). */
export function decodeTokenPayload(token: string): { email?: string; sub?: string } | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string; sub?: string };
  } catch {
    return null;
  }
}
