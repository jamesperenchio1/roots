/* eslint-disable react-refresh/only-export-components */
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
        gcTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { render };
