import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

// Component that throws
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('💥');
  return <div>Safe</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <HashRouter>
        <ErrorBoundary>
          <div data-testid="child">Hello</div>
        </ErrorBoundary>
      </HashRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI on error', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = () => {};

    render(
      <HashRouter>
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      </HashRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();

    console.error = consoleError;
  });
});
