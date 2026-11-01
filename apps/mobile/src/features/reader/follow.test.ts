import { FOLLOWING, pauseFollow } from './follow';

describe('follow state', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-01T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts following', () => {
    expect(FOLLOWING).toEqual({ following: true });
  });

  it('a drag pauses following and records when it started', () => {
    const now = Date.now();
    expect(pauseFollow(now)).toEqual({ following: false, pausedSince: now });
  });

  it('stays paused after scroll end and long delays until resume is called explicitly', () => {
    const paused = pauseFollow(Date.now());
    jest.advanceTimersByTime(60_000);
    expect(paused).toEqual({ following: false, pausedSince: Date.now() - 60_000 });
  });
});
