'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectProps {
  to?: string;
  href?: string;
}

export default function Redirect({ to, href }: RedirectProps) {
  const router = useRouter();
  const target = href || to;

  useEffect(() => {
    if (target) {
      router.replace(target);
    }
  }, [router, target]);

  return null;
}
