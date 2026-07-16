import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SellerDashboardPage from '@/pages/SellerDashboardPage';
import { USERS, LISTINGS, TRANSACTIONS } from '@/data/mockData';
import type { Profile, Listing } from '@/types';

vi.mock('@/lib/supabase', () => ({
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

function SellerDashboardWrapper({ initial = '/seller-dashboard/listings' } = {}) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/seller-dashboard/:tab" element={<SellerDashboardPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SellerDashboardPage', () => {
  beforeEach(() => {
    USERS.length = 0;
    LISTINGS.length = 0;
    TRANSACTIONS.length = 0;
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

    render(<SellerDashboardWrapper />);

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

    render(<SellerDashboardWrapper initial="/seller-dashboard/orders" />);

    expect(await screen.findByText(/pending revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
  });
});
