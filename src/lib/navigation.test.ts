import { describe, it, expect } from 'vitest';
import { sanitizeRedirect } from './navigation';

describe('sanitizeRedirect', () => {
  it('keeps same-site relative paths with query strings', () => {
    expect(sanitizeRedirect('/checkout/abc?foo=1')).toBe('/checkout/abc?foo=1');
  });
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    'javascript:alert(1)',
    '/ok\r\nSet-Cookie: x=1',
    'evil.com',
  ])('rejects %s', (input) => {
    expect(sanitizeRedirect(input, '/safe')).toBe('/safe');
  });
  it('falls back for empty input', () => {
    expect(sanitizeRedirect(null, '/x')).toBe('/x');
    expect(sanitizeRedirect('  ', '/x')).toBe('/x');
  });
});
