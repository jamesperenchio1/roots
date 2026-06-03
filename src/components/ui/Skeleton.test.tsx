import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, ListingCardSkeleton, ListingRowSkeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders with default classes', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.animate-pulse');
    expect(el).not.toBeNull();
    expect(el!.className).toContain('bg-zinc-800');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const el = container.querySelector('.h-4');
    expect(el).not.toBeNull();
    expect(el!.className).toContain('w-20');
  });
});

describe('ListingCardSkeleton', () => {
  it('renders card skeleton structure', () => {
    render(<ListingCardSkeleton />);
    // Should have multiple skeleton divs inside the card
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('ListingRowSkeleton', () => {
  it('renders row skeleton structure', () => {
    render(<ListingRowSkeleton />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
