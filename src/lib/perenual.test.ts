import { describe, it, expect } from 'vitest';
import { wateringToIcon, sunlightToEmoji } from './perenual';

describe('wateringToIcon', () => {
  it('maps Perenual watering levels to readable intervals', () => {
    expect(wateringToIcon('Frequent')).toBe('Every 3-4 days');
    expect(wateringToIcon('Average')).toBe('Weekly');
    expect(wateringToIcon('Minimum')).toBe('Every 2-3 weeks');
    expect(wateringToIcon('None')).toBe('Rarely');
  });

  it('passes through unknown/local values unchanged', () => {
    expect(wateringToIcon('Keep moist')).toBe('Keep moist');
    expect(wateringToIcon('Moderate')).toBe('Moderate');
  });
});

describe('sunlightToEmoji', () => {
  it('returns a single sun for empty/missing values', () => {
    expect(sunlightToEmoji([])).toBe('☀️');
    expect(sunlightToEmoji(undefined as unknown as string[])).toBe('☀️');
  });

  it('uses a 1-3 sun intensity scale', () => {
    // High / direct light = 3 suns
    expect(sunlightToEmoji(['Full sun'])).toBe('☀️☀️☀️');
    expect(sunlightToEmoji(['Bright direct'])).toBe('☀️☀️☀️');
    expect(sunlightToEmoji(['Partial sun'])).toBe('☀️☀️☀️');

    // Medium / indirect light = 2 suns
    expect(sunlightToEmoji(['Bright indirect'])).toBe('☀️☀️');
    expect(sunlightToEmoji(['Medium indirect'])).toBe('☀️☀️');
    expect(sunlightToEmoji(['Part shade'])).toBe('☀️☀️');

    // Low / shade = 1 sun
    expect(sunlightToEmoji(['Shade'])).toBe('☀️');
    expect(sunlightToEmoji(['Low light'])).toBe('☀️');
  });

  it('uses the midpoint for wide light ranges', () => {
    expect(sunlightToEmoji(['Full sun to partial'])).toBe('☀️☀️');
    expect(sunlightToEmoji(['Low to bright'])).toBe('☀️☀️');
  });

  it('handles multiple Perenual sunlight descriptors', () => {
    expect(sunlightToEmoji(['full sun', 'partial shade'])).toBe('☀️☀️☀️');
    expect(sunlightToEmoji(['part shade', 'full sun'])).toBe('☀️☀️☀️');
    expect(sunlightToEmoji(['filtered shade'])).toBe('☀️');
  });
});
