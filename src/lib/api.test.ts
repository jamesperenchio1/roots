import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
  SUPABASE_URL: 'https://test.supabase.co',
  PHOTO_BUCKET: 'listing-photos',
}));

vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('./validation', () => ({
  validateImageFile: vi.fn(),
  sanitizeText: (t: string) => t,
}));

vi.mock('./messaging', () => ({
  sendMessage: vi.fn(),
  getOrCreateDirectConversation: vi.fn(),
  mapMessage: vi.fn(),
  hydrateUserMessages: vi.fn(),
  getUserThreads: vi.fn(),
  getThreadMessages: vi.fn(),
  markThreadRead: vi.fn(),
  getOrCreateThreadId: vi.fn(),
  detectContactInfo: vi.fn(() => false),
}));

vi.mock('@/data/mockData', () => ({
  SPECIES: [],
  USERS: [],
  LISTINGS: [],
  TRANSACTIONS: [],
  PLANT_IMAGES: {},
  NOTIFICATIONS: [],
  SELLER_REVIEWS: [],
  COMMENTS: [],
  COMMENT_IMAGES: [],
  COMMENT_REACTIONS: [],
  OFFERS: [],
  PRICE_ALERTS: [],
  DISPUTES: [],
  WATCHLIST: [],
  PRICE_SNAPSHOTS: [],
  getListingByPlantId: vi.fn(),
  getListingById: vi.fn(),
  getSpeciesById: vi.fn(),
}));

const { mapProfile, mapListing } = await import('./api');

describe('mapProfile', () => {
  const baseRow = {
    id: 'user-1',
    display_name: 'Test User',
    is_admin: false,
    strike_count: 0,
    is_banned: false,
    language_preference: 'en',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  test('maps required fields correctly', () => {
    const profile = mapProfile(baseRow);
    expect(profile.id).toBe('user-1');
    expect(profile.display_name).toBe('Test User');
    expect(profile.is_admin).toBe(false);
    expect(profile.is_banned).toBe(false);
    expect(profile.language_preference).toBe('en');
  });

  test('uses default display_name when missing', () => {
    const profile = mapProfile({ ...baseRow, display_name: undefined });
    expect(profile.display_name).toBe('Plant Lover');
  });

  test('uses default language_preference en when missing', () => {
    const profile = mapProfile({ ...baseRow, language_preference: undefined });
    expect(profile.language_preference).toBe('en');
  });

  test('truthy is_admin maps to true', () => {
    const profile = mapProfile({ ...baseRow, is_admin: true });
    expect(profile.is_admin).toBe(true);
  });

  test('avatar_url undefined when not in row', () => {
    const profile = mapProfile(baseRow);
    expect(profile.avatar_url).toBeUndefined();
  });

  test('avatar_url forwarded when present', () => {
    const profile = mapProfile({ ...baseRow, avatar_url: 'https://example.com/avatar.jpg' });
    expect(profile.avatar_url).toBe('https://example.com/avatar.jpg');
  });
});

describe('mapListing', () => {
  const baseRow = {
    id: 'listing-1',
    plant_id: 'plant-1',
    seller_id: 'user-1',
    price_thb: 500,
    size_category: 'M',
    description: 'Nice plant',
    delivery_options: ['ship'],
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    photos: ['https://example.com/photo.jpg'],
  };

  test('maps required fields', () => {
    const listing = mapListing(baseRow, {});
    expect(listing.id).toBe('listing-1');
    expect(listing.price_thb).toBe(500);
    expect(listing.size_category).toBe('M');
    expect(listing.seller_id).toBe('user-1');
  });

  test('defaults size_category to M when missing', () => {
    const listing = mapListing({ ...baseRow, size_category: undefined }, {});
    expect(listing.size_category).toBe('M');
  });

  test('uses FALLBACK_IMG when no photos provided', () => {
    const listing = mapListing({ ...baseRow, photos: [], image_url: undefined }, {});
    expect(listing.photos).toBeDefined();
  });
});
