import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

// Longer than any push (the end event arrives late while the JS thread is busy), so a screen whose transition reports no
// end (opened without one) still draws its art.
const FALLBACK_MS = 1000;

// Outside a navigator (tests, a screen rendered alone) there is no navigation object.
function useOptionalNavigation() {
  try {
    return useNavigation();
  } catch {
    return undefined;
  }
}

/**
 * False until the screen's push transition has ended: the map draws its header and timeline at once and mounts the heavy art
 * after (developer, 15 Nov 2026: the screen must appear on the next frame). True at once outside a navigator.
 */
export function useArtReady(): boolean {
  const navigation = useOptionalNavigation();
  const [ready, setReady] = useState(navigation === undefined);

  useEffect(() => {
    if (ready || navigation === undefined) {
      return;
    }
    const done = () => setReady(true);
    const timer = setTimeout(done, FALLBACK_MS);
    const unsubscribe = (navigation.addListener as (event: string, callback: () => void) => () => void)('transitionEnd', done);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation, ready]);

  return ready;
}

/**
 * True a frame after `ready` turns true (a requestAnimationFrame, then a macrotask), so what it gates mounts after the frame
 * that shows the rest of the screen has been drawn. Once true it stays true.
 */
export function useAfterFrame(ready: boolean): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ready || shown) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setShown(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [ready, shown]);
  return shown;
}
