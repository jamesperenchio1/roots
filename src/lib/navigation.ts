/**
 * Sanitize a redirect target to prevent open-redirect attacks.
 * Accepts only relative paths rooted at the app base. Rejects protocol-relative,
 * absolute, and external URLs.
 */
export function sanitizeRedirect(redirect: string | null | undefined, fallback = '/'): string {
  if (!redirect) return fallback;
  const trimmed = redirect.trim();
  if (!trimmed) return fallback;

  // Reject anything that looks like an absolute URL or protocol-relative URL.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    return fallback;
  }

  // Only allow paths that start with '/'.
  if (!trimmed.startsWith('/')) return fallback;

  // Reject newline-based header injection attempts.
  if (/[\r\n]/.test(trimmed)) return fallback;

  return trimmed;
}
