/**
 * Cookie-backed storage adapter for Supabase Auth.
 *
 * Note: In a pure SPA the session cookie cannot be HttpOnly (the browser client
 * needs to read it), but we still gain from `Secure` + `SameSite=Strict` and avoid
 * keeping the session around in `localStorage` where it is vulnerable to XSS.
 */

const SESSION_KEY = 'sb-session';

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;${secure}SameSite=Strict`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
}

export const cookieStorage: Storage = {
  length: 1,
  key() {
    return SESSION_KEY;
  },
  getItem(key) {
    if (key !== SESSION_KEY) return null;
    return getCookie(key);
  },
  setItem(key, value) {
    if (key !== SESSION_KEY) return;
    setCookie(key, value);
  },
  removeItem(key) {
    if (key !== SESSION_KEY) return;
    deleteCookie(key);
  },
  clear() {
    deleteCookie(SESSION_KEY);
  },
};
