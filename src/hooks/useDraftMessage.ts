import { useCallback, useEffect, useRef } from 'react';

const PREFIX = 'roots:draft:';
const DEBOUNCE_MS = 500;

export function useDraftMessage(conversationId: string | undefined) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((): string => {
    if (!conversationId) return '';
    try {
      return localStorage.getItem(`${PREFIX}${conversationId}`) ?? '';
    } catch {
      return '';
    }
  }, [conversationId]);

  const save = useCallback((text: string) => {
    if (!conversationId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        if (text) localStorage.setItem(`${PREFIX}${conversationId}`, text);
        else localStorage.removeItem(`${PREFIX}${conversationId}`);
      } catch { /* ignore quota errors */ }
    }, DEBOUNCE_MS);
  }, [conversationId]);

  const clear = useCallback(() => {
    if (!conversationId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try { localStorage.removeItem(`${PREFIX}${conversationId}`); } catch { /* noop */ }
  }, [conversationId]);

  // Cancel pending save on unmount.
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return { load, save, clear };
}
