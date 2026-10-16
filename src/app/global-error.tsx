'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div role="alert" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ color: '#a1a1aa', maxWidth: 420, fontSize: 14 }}>
            The app hit an unexpected problem. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#000', border: 0, fontWeight: 500, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
