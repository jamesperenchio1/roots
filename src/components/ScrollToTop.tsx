'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    // Don't scroll the chat thread to the top; the message list manages its own scroll position.
    if (pathname?.startsWith('/messages')) return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
