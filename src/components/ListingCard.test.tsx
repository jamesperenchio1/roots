import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListingCard } from './ListingCard';
import type { Listing } from '@/types';

const mockListing: Listing = {
  id: 'listing-1',
  plant_id: 'p-001',
  seller_id: 'seller-1',
  price_thb: 2500,
  size_category: 'M',
  description: 'A healthy variegated specimen.',
  delivery_options: ['ship', 'pickup'],
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  species: {
    id: 'sp-001',
    scientific_name: 'Monstera deliciosa',
    common_name_en: 'Swiss Cheese Plant',
    common_name_th: 'มอนสเตร่า',
    category: 'aroid',
  },
  seller: { id: 'seller-1', display_name: 'Plant Seller' },
  pickup_province: 'Bangkok',
  photos: [{ storage_path: 'https://example.com/photo.jpg' }],
} as Listing;

function renderCard(props: React.ComponentProps<typeof ListingCard>) {
  return render(
    <MemoryRouter>
      <ListingCard {...props} />
    </MemoryRouter>
  );
}

describe('ListingCard', () => {
  test('renders link to listing detail', () => {
    renderCard({ listing: mockListing, layout: 'minimal' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/listing-1');
  });

  test('minimal layout shows common name, price and size', () => {
    renderCard({ listing: mockListing, layout: 'minimal' });
    expect(screen.getByText('Swiss Cheese Plant')).toBeInTheDocument();
    expect(screen.getByText('2,500 THB')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  test('browse layout shows seller, delivery options and province', () => {
    renderCard({ listing: mockListing, layout: 'browse', sparklineData: [1, 2, 3] });
    expect(screen.getByText('Plant Seller')).toBeInTheDocument();
    expect(screen.getByText('Shipping')).toBeInTheDocument();
    expect(screen.getByText('Pickup')).toBeInTheDocument();
    expect(screen.getByText('Bangkok')).toBeInTheDocument();
  });

  test('uses scientific name as image alt when available', () => {
    renderCard({ listing: mockListing, layout: 'minimal' });
    expect(screen.getByAltText('Monstera deliciosa')).toBeInTheDocument();
  });

  test('renders top slot content', () => {
    renderCard({ listing: mockListing, layout: 'minimal', topSlot: <span>Top badge</span> });
    expect(screen.getByText('Top badge')).toBeInTheDocument();
  });
});
