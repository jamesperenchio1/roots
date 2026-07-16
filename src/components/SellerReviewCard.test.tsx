import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SellerReviewCard } from './SellerReviewCard';
import type { SellerReview } from '@/types';

function createReview(overrides: Partial<SellerReview> = {}): SellerReview {
  return {
    id: 'r-1',
    seller_id: 's-1',
    reviewer_id: 'b-1',
    reviewer: { id: 'b-1', display_name: 'Buyer' },
    overall_rating: 5,
    packaging_rating: 5,
    plant_condition_rating: 5,
    communication_rating: 5,
    shipping_speed_rating: 5,
    listing_accuracy_rating: 5,
    comment: 'Great plant',
    image_urls: ['https://example.com/photo.jpg'],
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as SellerReview;
}

describe('SellerReviewCard', () => {
  it('renders review comment', () => {
    render(<SellerReviewCard review={createReview()} />);
    expect(document.body.textContent).toContain('Great plant');
  });

  it('shows fallback icon when a review image fails to load', () => {
    render(<SellerReviewCard review={createReview()} />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();

    if (img) {
      fireEvent.error(img);
      expect(document.querySelector('svg')).toBeInTheDocument();
      expect(img).not.toBeVisible();
    }
  });
});
