import { useCallback } from 'react';

export function useAutoResizeTextarea() {
  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      resize(e.target);
    },
    [resize]
  );

  return { resize, handleInput };
}
