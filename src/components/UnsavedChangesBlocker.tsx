import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function UnsavedChangesBlocker({ isDirty }: { isDirty: boolean }) {
  const { t } = useTranslation('common');
  const blocker = useBlocker(() => isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  if (blocker.state !== 'blocked') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-medium mb-2">{t('unsavedChanges.title')}</h3>
        <p className="text-sm text-zinc-400 mb-6">{t('unsavedChanges.description')}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => blocker.reset?.()}
            className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => blocker.proceed?.()}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white"
          >
            {t('actions.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
