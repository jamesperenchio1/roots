import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SellerDashboardPage from '@/page-components/SellerDashboardPage';
import { USERS, LISTINGS, TRANSACTIONS } from '@/data/mockData';
import type { Profile, Listing } from '@/types';

const mockNavigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  params: { tab: 'listings' } as { tab?: string },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockNavigation.push,
    replace: mockNavigation.replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/seller-dashboard/listings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockNavigation.params,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [] })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [] })),
          limit: vi.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'seller-1',
      email: 'seller@example.com',
      display_name: 'Plant Seller',
      rating: 4.8,
      sales_count: 12,
      location: 'Bangkok',
    },
    isRestoring: false,
    refreshProfile: vi.fn(),
  }),
}));

function resetMockData() {
  USERS.length = 0;
  LISTINGS.length = 0;
  TRANSACTIONS.length = 0;
}

describe('SellerDashboardPage', () => {
  beforeEach(() => {
    resetMockData();
    mockNavigation.params = { tab: 'listings' };
  });

  it('renders seller info and key tabs', async () => {
    USERS.push({
      id: 'seller-1',
      display_name: 'Plant Seller',
      email: 'seller@example.com',
      role: 'user',
      rating: 4.8,
      sales_count: 12,
      location: 'Bangkok',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile);

    LISTINGS.push({
      id: 'l1',
      seller_id: 'seller-1',
      plant_id: 'p1',
      price_thb: 1500,
      size_category: 'Medium',
      category: 'aroid',
      description: 'A healthy plant',
      delivery_options: ['shipping', 'pickup'],
      photos: [{ storage_path: '/img.jpg', uploaded_at: new Date().toISOString() }],
      status: 'active',
      created_at: new Date().toISOString(),
      last_photo_update_at: new Date().toISOString(),
    } as Listing);

    render(<SellerDashboardPage />);

    expect(await screen.findByText('Plant Seller')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new listing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /offers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
  });

  it('switches to orders tab', async () => {
    USERS.push({
      id: 'seller-1',
      display_name: 'Plant Seller',
      email: 'seller@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile);

    mockNavigation.params = { tab: 'orders' };

    render(<SellerDashboardPage />);

    expect(await screen.findByText(/pending revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
  });
});
