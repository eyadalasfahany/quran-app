import { useCallback, useEffect, useRef, useState } from 'react';

import { usePlayerStore } from '@/features/audio/playerStore';

import { FOLLOWING, pauseFollow, type FollowState } from './follow';

/**
 * Whether the reader follows the recitation, and the handlers that pause it. A drag pauses following until the
 * resume pill or a new play command calls `resume`.
 */
export function useRecitationFollow(initiallyFollowing = true): {
  following: boolean;
  onUserScrollStart: () => void;
  resume: () => void;
} {
  const [state, setState] = useState<FollowState>(() =>
    initiallyFollowing ? FOLLOWING : pauseFollow(0),
  );
  const playCommand = usePlayerStore((store) => store.playCommand);
  const seenPlayCommand = useRef(playCommand);

  useEffect(() => {
    if (playCommand === seenPlayCommand.current) {
      return;
    }
    seenPlayCommand.current = playCommand;
    setState(FOLLOWING);
  }, [playCommand]);

  const onUserScrollStart = useCallback(() => {
    setState(pauseFollow(Date.now()));
  }, []);

  const resume = useCallback(() => {
    setState(FOLLOWING);
  }, []);

  return { following: state.following, onUserScrollStart, resume };
}
