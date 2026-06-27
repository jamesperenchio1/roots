import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('logs info messages', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('test message', { key: 'value' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs error messages', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something broke', new Error('fail'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('buffers entries', () => {
    logger.info('buffer test');
    const buffer = logger.getBuffer();
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[buffer.length - 1].message).toBe('buffer test');
  });
});
