import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  isValidPromptPayId,
  isValidEmail,
  validateImageFile,
  isValidPrice,
  validateShippingAddress,
} from './validation';

describe('sanitizeText', () => {
  it('removes HTML tags', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('enforces max length', () => {
    expect(sanitizeText('a'.repeat(100), 10)).toBe('a'.repeat(10));
  });
});

describe('isValidPromptPayId', () => {
  it('accepts 10-digit phone numbers', () => {
    expect(isValidPromptPayId('0812345678')).toBe(true);
  });

  it('accepts 13-digit national IDs', () => {
    expect(isValidPromptPayId('1234567890123')).toBe(true);
  });

  it('rejects invalid lengths', () => {
    expect(isValidPromptPayId('12345')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('validateImageFile', () => {
  it('accepts valid images', () => {
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(file, 5).ok).toBe(true);
  });

  it('rejects non-images', () => {
    const file = new File(['x'], 'test.exe', { type: 'application/exe' });
    expect(validateImageFile(file, 5).ok).toBe(false);
  });

  it('rejects oversized files', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(file, 5).ok).toBe(false);
  });
});

describe('isValidPrice', () => {
  it('accepts reasonable prices', () => {
    expect(isValidPrice(100)).toBe(true);
    expect(isValidPrice(1000000)).toBe(true);
  });

  it('rejects invalid prices', () => {
    expect(isValidPrice(5)).toBe(false);
    expect(isValidPrice(20000000)).toBe(false);
    expect(isValidPrice(NaN)).toBe(false);
  });
});

describe('validateShippingAddress', () => {
  it('validates required fields', () => {
    const result = validateShippingAddress({});
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.address).toBeDefined();
    expect(result.errors.phone).toBeDefined();
  });

  it('accepts valid addresses', () => {
    const result = validateShippingAddress({
      name: 'John Doe',
      address: '123 Main St',
      phone: '0812345678',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    const result = validateShippingAddress({
      name: 'John',
      address: '123 Main',
      phone: '123',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });
});
