import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  test('renders an SVG polyline for data with two or more points', () => {
    render(<Sparkline data={[10, 20, 15, 30]} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(document.querySelector('polyline')).toBeInTheDocument();
  });

  test('renders nothing when there are fewer than two data points', () => {
    render(<Sparkline data={[10]} />);
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  test('uses the provided color for an upward trend', () => {
    const { container } = render(<Sparkline data={[10, 20]} color="#abcdef" />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#abcdef');
  });

  test('uses red for a downward trend', () => {
    const { container } = render(<Sparkline data={[20, 10]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#ef4444');
  });
});
