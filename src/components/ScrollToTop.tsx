import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Don't scroll the chat thread to the top; the message list manages its own scroll position.
    if (pathname.startsWith('/messages')) return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
