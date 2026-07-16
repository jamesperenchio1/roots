export const publicKeys = {
  all: () => ['public'] as const,
  listings: (filters?: Record<string, unknown>) => ['public', 'listings', filters ?? {}] as const,
  listing: (id?: string) => ['public', 'listings', id] as const,
  marketOverview: () => ['public', 'marketOverview'] as const,
  priceSnapshots: (speciesId?: string, sizeCategory?: string) =>
    ['public', 'priceSnapshots', speciesId ?? 'all', sizeCategory ?? 'all'] as const,
  seller: (id?: string) => ['public', 'sellers', id] as const,
  sellerReviews: (sellerId?: string) => ['public', 'sellerReviews', sellerId ?? 'all'] as const,
};

export const userKeys = {
  all: (userId: string) => ['user', userId] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  transactions: (userId: string) => ['user', userId, 'transactions'] as const,
  notifications: (userId: string) => ['user', userId, 'notifications'] as const,
  offers: (userId: string) => ['user', userId, 'offers'] as const,
  watchlist: (userId: string) => ['user', userId, 'watchlist'] as const,
  priceAlerts: (userId: string) => ['user', userId, 'priceAlerts'] as const,
  disputes: (userId: string) => ['user', userId, 'disputes'] as const,
  sellerListings: (userId: string) => ['user', userId, 'sellerListings'] as const,
};

export const transactionKeys = {
  detail: (id?: string) => ['transaction', id] as const,
};

export const adminKeys = {
  dashboardStats: () => ['public', 'dashboardStats'] as const,
};

export const messageKeys = {
  all: (userId: string) => ['messages', userId] as const,
  conversations: (userId: string) => ['messages', userId, 'conversations'] as const,
  conversation: (userId: string, conversationId: string) =>
    ['messages', userId, 'conversations', conversationId] as const,
};

export const commentKeys = {
  forSpecies: (speciesId: string) => ['comments', 'species', speciesId] as const,
  forListing: (listingId: string) => ['comments', 'listing', listingId] as const,
};
