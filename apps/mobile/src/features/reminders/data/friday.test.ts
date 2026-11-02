import { timesFor } from '@/features/salah/data/prayer-times';

import { fridayClock, fridayDhuhrClock, FRIDAY_WEEKDAY, KAHF_ROUTE, nextFriday } from './friday';
import { NO_FRIDAY_REMINDER } from './goal-settings';

jest.mock('@/features/salah/data/prayer-times', () => ({
  timesFor: jest.fn(),
}));

const COORDS = { lat: 30.04, lng: 31.24 };

describe('nextFriday', () => {
  it('returns the Friday after a Thursday, at local midnight', () => {
    const next = nextFriday(new Date(2026, 2, 26, 10, 15));

    expect(next.getDay()).toBe(5);
    expect(next.getDate()).toBe(27);
    expect(next.getHours()).toBe(0);
  });

  it('is never today: a Friday gives the Friday a week later', () => {
    expect(nextFriday(new Date(2026, 2, 27, 9)).getDate()).toBe(3);
    expect(nextFriday(new Date(2026, 2, 27, 9)).getMonth()).toBe(3);
  });

  it('crosses the spring DST change without moving the day or the midnight', () => {
    // Saturday before the European spring change: the next Friday is after it.
    const next = nextFriday(new Date(2026, 2, 28, 23, 30));

    expect(next.getDay()).toBe(5);
    expect(next.getDate()).toBe(3);
    expect(next.getMonth()).toBe(3);
    expect(next.getHours()).toBe(0);
  });

  it('crosses the autumn DST change the same way', () => {
    const next = nextFriday(new Date(2026, 9, 24, 12));

    expect(next.getDay()).toBe(5);
    expect(next.getDate()).toBe(30);
    expect(next.getHours()).toBe(0);
  });

  it('rolls over the year end', () => {
    const next = nextFriday(new Date(2026, 11, 31, 12));

    expect(next.getDay()).toBe(5);
    expect(next.getFullYear()).toBe(2027);
  });
});

describe('fridayDhuhrClock', () => {
  beforeEach(() => {
    jest.mocked(timesFor).mockReset();
  });

  it('reads the Dhuhr of the next Friday from the Salah engine, rounded to the minute', () => {
    jest.mocked(timesFor).mockReturnValue({ dhuhr: new Date(2026, 2, 27, 12, 34, 40) } as never);

    expect(fridayDhuhrClock(new Date(2026, 2, 26, 9), COORDS)).toEqual({ hour: 12, minute: 35 });
    const [day] = jest.mocked(timesFor).mock.calls[0] ?? [];
    expect(day?.getDay()).toBe(5);
    expect(day?.getDate()).toBe(27);
  });

  it('returns null without coordinates, without asking the engine', () => {
    expect(fridayDhuhrClock(new Date(2026, 2, 26), null)).toBeNull();
    expect(timesFor).not.toHaveBeenCalled();
  });

  it('returns null when the engine gives no finite time', () => {
    jest.mocked(timesFor).mockReturnValue({ dhuhr: new Date(Number.NaN) } as never);

    expect(fridayDhuhrClock(new Date(2026, 2, 26), COORDS)).toBeNull();
  });
});

describe('fridayClock', () => {
  beforeEach(() => {
    jest.mocked(timesFor).mockReturnValue({ dhuhr: new Date(2026, 2, 27, 12, 10) } as never);
  });

  it('uses the Dhuhr time in Dhuhr mode', () => {
    expect(fridayClock(NO_FRIDAY_REMINDER, new Date(2026, 2, 26), COORDS)).toEqual({ hour: 12, minute: 10 });
  });

  it('uses the chosen time in clock mode, without a location', () => {
    expect(fridayClock({ enabled: true, mode: 'clock', clockTime: '07:05' }, new Date(2026, 2, 26), null)).toEqual({
      hour: 7,
      minute: 5,
    });
  });

  it('returns null in clock mode with no time chosen', () => {
    expect(fridayClock({ enabled: true, mode: 'clock', clockTime: null }, new Date(2026, 2, 26), COORDS)).toBeNull();
  });
});

describe('Friday constants', () => {
  it('uses the weekly weekday for Friday (Sunday is 1) and the Kahf route', () => {
    expect(FRIDAY_WEEKDAY).toBe(6);
    expect(KAHF_ROUTE).toBe('/read/18:1');
  });
});
