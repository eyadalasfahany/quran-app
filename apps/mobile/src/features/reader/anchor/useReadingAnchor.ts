import { useCallback, useEffect, useRef, useState } from 'react';

import {
  READING_ANCHOR_WRITE_MS,
  type ReaderMode,
  type ReadingPosition,
  resolveInitialAnchor,
  writeReadingAnchor,
} from './reading-anchor';

export type VisibleVerseUpdate = {
  verseKey: string;
  page?: number | null;
};

export type ReadingAnchor = ReadingPosition & {
  setMode: (mode: ReaderMode) => void;
  setVisible: (update: VisibleVerseUpdate) => void;
};

export function useReadingAnchor(): ReadingAnchor {
  const [position, setPosition] = useState<ReadingPosition>(() => resolveInitialAnchor());
  const positionRef = useRef(position);
  const pending = useRef<ReadingPosition | null>(null);
  const lastWriteAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pending.current;
    if (next === null) {
      return;
    }
    pending.current = null;
    writeReadingAnchor(next);
    lastWriteAt.current = Date.now();
  }, []);

  useEffect(() => {
    return () => {
      commit();
    };
  }, [commit]);

  const schedule = useCallback(
    (next: ReadingPosition) => {
      positionRef.current = next;
      setPosition(next);
      pending.current = next;
      const elapsed = lastWriteAt.current === null ? READING_ANCHOR_WRITE_MS : Date.now() - lastWriteAt.current;
      if (elapsed >= READING_ANCHOR_WRITE_MS) {
        commit();
        return;
      }
      if (timer.current === null) {
        timer.current = setTimeout(commit, READING_ANCHOR_WRITE_MS - elapsed);
      }
    },
    [commit],
  );

  const setVisible = useCallback(
    (update: VisibleVerseUpdate) => {
      const current = positionRef.current;
      schedule({
        verseKey: update.verseKey,
        page: update.page === undefined ? current.page : update.page,
        mode: current.mode,
      });
    },
    [schedule],
  );

  const setMode = useCallback(
    (mode: ReaderMode) => {
      schedule({ ...positionRef.current, mode });
    },
    [schedule],
  );

  return {
    verseKey: position.verseKey,
    page: position.page,
    mode: position.mode,
    setMode,
    setVisible,
  };
}
