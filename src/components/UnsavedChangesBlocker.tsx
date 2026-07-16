'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function UnsavedChangesBlocker({ isDirty }: { isDirty: boolean }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Next.js App Router does not provide a built-in navigation blocker.
  // Browser-level unsaved-changes protection is handled via beforeunload above.
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-200 md:left-auto md:right-4 md:max-w-sm">
      {t('unsavedChanges.description')}
    </div>
  );
}
