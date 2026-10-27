import { useCallback, useEffect, useRef, useState } from 'react';

import { downloadAllPageFonts, type PageFontProgress } from './fonts';

export type DownloadAllMushafFontsState = {
  running: boolean;
  progress: PageFontProgress | null;
  error: Error | null;
  start: () => void;
  cancel: () => void;
};

export function useDownloadAllMushafFonts(): DownloadAllMushafFontsState {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PageFontProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    cancel();
    setError(null);
    setRunning(true);
    const job = downloadAllPageFonts(setProgress);
    cancelRef.current = job.cancel;
    void job.done
      .then(() => {
        setRunning(false);
        cancelRef.current = null;
      })
      .catch((reason: unknown) => {
        setRunning(false);
        cancelRef.current = null;
        if (reason instanceof DOMException && reason.name === 'AbortError') {
          return;
        }
        setError(reason instanceof Error ? reason : new Error('Could not download mushaf fonts.'));
      });
  }, [cancel]);

  return { running, progress, error, start, cancel };
}
