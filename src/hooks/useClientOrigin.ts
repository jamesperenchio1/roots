'use client';

import { useState, useEffect } from 'react';

export function useClientOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
