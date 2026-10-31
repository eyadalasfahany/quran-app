import { useEffect, useState } from 'react';

/**
 * A ticking clock for countdown UI. Re-renders every `intervalMs` with the current time;
 * pass a longer interval (or Infinity) on screens that don't count down.
 */
export function useNow(intervalMs: number = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!Number.isFinite(intervalMs)) {
      return undefined;
    }
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
