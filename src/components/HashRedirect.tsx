'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function HashRedirect() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#/')) return;
    const rest = hash.slice(1).replace(/^\/+/, '');
    redirected.current = true;
    router.replace(rest ? `/${rest}` : '/');
  }, [router]);

  return null;
}