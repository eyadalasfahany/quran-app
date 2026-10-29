import { useCallback, useEffect, useRef, useState } from 'react';

import { FOLLOW_RESUME_MS, FOLLOWING, pauseFollow, scrollEnded, settleFollow, type FollowState } from './follow';

/**
 * Whether the reader follows the recitation, and the handlers that pause it. A drag pauses following; the
 * scroll's end (and each momentum end) starts the 5 s inactivity clock; `resume` jumps back at once.
 */
export function useRecitationFollow(): {
  following: boolean;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  resume: () => void;
} {
  const [state, setState] = useState<FollowState>(FOLLOWING);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const onUserScrollStart = useCallback(() => {
    clear();
    setState(pauseFollow(Date.now()));
  }, [clear]);

  const onUserScrollEnd = useCallback(() => {
    clear();
    const now = Date.now();
    setState((current) => scrollEnded(current, now));
    timer.current = setTimeout(() => {
      timer.current = null;
      setState((current) => settleFollow(current, Date.now()));
    }, FOLLOW_RESUME_MS);
  }, [clear]);

  const resume = useCallback(() => {
    clear();
    setState(FOLLOWING);
  }, [clear]);

  return { following: state.following, onUserScrollStart, onUserScrollEnd, resume };
}
