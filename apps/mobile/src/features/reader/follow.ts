// Follow the recitation (ADR 0037): while the player is playing an ayah, the reader moves with it until the reader
// scrolls. Following resumes only from the resume pill or a new play command — never on a timer.

/**
 * `following` moves the reader to the recited ayah. When paused, `pausedSince` records when the reader last
 * interrupted following (drag start in Mushaf/Reading, swipe in Focus).
 */
export type FollowState = { following: true } | { following: false; pausedSince: number };

export const FOLLOWING: FollowState = { following: true };

/** The reader interrupted following at `now`: following pauses until `resume()`. */
export function pauseFollow(now: number): FollowState {
  return { following: false, pausedSince: now };
}
