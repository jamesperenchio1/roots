import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // eslint-disable-next-line no-console
        console.log('[PWA] Service worker registered', r.scope);
      }
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('[PWA] Service worker registration error', error);
    },
  });

  const dismiss = () => {
    setNeedRefresh(false);
  };

  const reload = () => {
    void updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 max-w-sm bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
          <RefreshCw className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Update available</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            A new version of Root is ready. Reload to get the latest features and fixes.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={reload}
              className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
