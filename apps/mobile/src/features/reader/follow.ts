// Follow the recitation (developer, 29 Oct 2026): while the player is playing an ayah, the reader moves with it
// until the reader drags. After 5 s with no scroll, following resumes. Pure state: the hook owns the clock and
// the timer (useRecitationFollow).

export const FOLLOW_RESUME_MS = 5000;

/**
 * `following` moves the reader to the recited ayah. When paused, `pausedSince` is the time of the reader's last
 * scroll activity (a drag start or end); the inactivity clock runs from it.
 */
export type FollowState = { following: true } | { following: false; pausedSince: number };

export const FOLLOWING: FollowState = { following: true };

/** The reader started a drag at `now`: following pauses. */
export function pauseFollow(now: number): FollowState {
  return { following: false, pausedSince: now };
}

/** The reader's scroll ended at `now`. A paused state restarts its inactivity clock from here. */
export function scrollEnded(state: FollowState, now: number): FollowState {
  return state.following ? state : { following: false, pausedSince: now };
}

/** The inactivity check: following resumes once FOLLOW_RESUME_MS has passed since the last scroll activity. */
export function settleFollow(state: FollowState, now: number): FollowState {
  if (state.following) {
    return state;
  }
  return now - state.pausedSince >= FOLLOW_RESUME_MS ? FOLLOWING : state;
}
