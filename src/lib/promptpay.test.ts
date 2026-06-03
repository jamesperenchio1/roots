import { describe, it, expect } from 'vitest';
import { buildPromptPayPayload, crc16 } from './promptpay';

describe('crc16', () => {
  it('produces a 4-char hex string', () => {
    const result = crc16('test');
    expect(result).toHaveLength(4);
    expect(/^[0-9A-F]{4}$/.test(result)).toBe(true);
  });
});

describe('buildPromptPayPayload', () => {
  it('includes promptpay ID for mobile', () => {
    const payload = buildPromptPayPayload('0812345678', 500);
    expect(payload).toContain('0066');
    expect(payload).toContain('500.00');
    expect(payload.startsWith('00')).toBe(true);
  });

  it('includes promptpay ID for national ID', () => {
    const payload = buildPromptPayPayload('1234567890123', 1000);
    expect(payload).toContain('02');
    expect(payload).toContain('1234567890123');
  });

  it('works without amount', () => {
    const payload = buildPromptPayPayload('0812345678');
    expect(payload).toContain('01');
    expect(payload).not.toContain('54');
  });
});
