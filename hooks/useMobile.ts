'use client';

import { useState, useEffect } from 'react';

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    // Sync with media query for better reliability
    const handler = () => check();
    check();
    media.addEventListener('change', handler);
    window.addEventListener('resize', check);
    return () => {
      media.removeEventListener('change', handler);
      window.removeEventListener('resize', check);
    };
  }, [breakpoint]);

  return isMobile;
}
