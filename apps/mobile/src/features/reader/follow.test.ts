import {
  FOLLOW_RESUME_MS,
  FOLLOWING,
  pauseFollow,
  scrollEnded,
  settleFollow,
} from './follow';

describe('follow state', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-29T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts following', () => {
    expect(FOLLOWING).toEqual({ following: true });
    expect(FOLLOW_RESUME_MS).toBe(5000);
  });

  it('a drag pauses following and records when it started', () => {
    const now = Date.now();
    expect(pauseFollow(now)).toEqual({ following: false, pausedSince: now });
  });

  it('a scroll end while paused restarts the inactivity clock from the end', () => {
    const start = Date.now();
    const paused = pauseFollow(start);
    jest.advanceTimersByTime(2000);
    const ended = scrollEnded(paused, Date.now());
    expect(ended).toEqual({ following: false, pausedSince: start + 2000 });
  });

  it('a scroll end while following changes nothing', () => {
    expect(scrollEnded(FOLLOWING, Date.now())).toBe(FOLLOWING);
  });

  it('stays paused until 5 s after the last scroll activity, then resumes', () => {
    const ended = scrollEnded(pauseFollow(Date.now()), Date.now());
    jest.advanceTimersByTime(FOLLOW_RESUME_MS - 1);
    expect(settleFollow(ended, Date.now())).toBe(ended);
    jest.advanceTimersByTime(1);
    expect(settleFollow(ended, Date.now())).toEqual(FOLLOWING);
  });

  it('a new drag before the 5 s is up restarts the clock instead of resuming', () => {
    const first = scrollEnded(pauseFollow(Date.now()), Date.now());
    jest.advanceTimersByTime(4000);
    const again = pauseFollow(Date.now());
    jest.advanceTimersByTime(4000);
    expect(settleFollow(again, Date.now())).toBe(again);
    expect(settleFollow(first, Date.now())).toEqual(FOLLOWING);
  });

  it('settling a following state changes nothing', () => {
    expect(settleFollow(FOLLOWING, Date.now())).toBe(FOLLOWING);
  });
});
