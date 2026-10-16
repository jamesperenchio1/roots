'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-medium">{t('errors.somethingWentWrong', { defaultValue: 'Something went wrong' })}</h1>
      <p className="text-sm text-zinc-400 max-w-md">
        {t('errors.tryAgainHint', { defaultValue: 'This page hit an unexpected problem. You can try again or head back home.' })}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
        >
          {t('actions.tryAgain', { defaultValue: 'Try again' })}
        </button>
        <Link href="/" className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5">
          {t('actions.goHome', { defaultValue: 'Go home' })}
        </Link>
      </div>
      {error.digest && <p className="text-xs text-zinc-600">Ref: {error.digest}</p>}
    </div>
  );
}
