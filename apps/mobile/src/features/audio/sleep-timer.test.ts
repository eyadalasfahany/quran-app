import { AppState } from 'react-native';

import { pause, seek } from './player';
import { usePlayerStore, type PlayerState } from './playerStore';
import { resetSleepTimerForTests, selectRemainingMinutes, useSleepTimerStore, FADE_MS } from './sleep-timer';

jest.mock('./player', () => ({ pause: jest.fn(), seek: jest.fn() }));

const MINUTE = 60_000;
const START = new Date('2026-10-29T10:00:00Z');

// The volume control is added to playerStore by step 3a; the tests install a spy in its place.
let volumes: number[];
let order: string[];
let appStateHandler: ((next: 'active' | 'background' | 'inactive') => void) | undefined;

function installVolume(): void {
  volumes = [];
  usePlayerStore.setState({
    setVolume: (volume: number) => {
      volumes.push(volume);
      order.push(`volume:${volume}`);
    },
  } as unknown as Partial<PlayerState>);
}

const sleep = () => useSleepTimerStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(START);
  order = [];
  jest.mocked(pause).mockImplementation(() => {
    order.push('pause');
  });
  jest.mocked(pause).mockClear();
  jest.mocked(seek).mockClear();
  appStateHandler = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as typeof appStateHandler;
    return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
  });
  usePlayerStore.setState({ chapterId: 1, status: 'playing' });
  installVolume();
  resetSleepTimerForTests();
});

afterEach(() => {
  resetSleepTimerForTests();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('timed modes', () => {
  it.each([
    ['minutes15', 15],
    ['minutes30', 30],
    ['minutes60', 60],
  ] as const)('%s fades at its deadline and pauses after the fade', (mode, minutes) => {
    sleep().choose(mode);
    const deadline = minutes * MINUTE;

    jest.advanceTimersByTime(deadline - 1_000);
    expect(sleep().fading).toBe(false);
    expect(pause).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_000);
    expect(sleep().fading).toBe(true);
    expect(pause).not.toHaveBeenCalled();

    jest.advanceTimersByTime(FADE_MS - 250);
    expect(pause).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(sleep().mode).toBe('off');
  });

  it('fades the volume in steps down to 0 before pausing, then restores it to 1', () => {
    sleep().choose('minutes15');
    jest.advanceTimersByTime(15 * MINUTE + FADE_MS + 1_000);

    const fadeSteps = volumes.slice(0, -1);
    expect(fadeSteps.length).toBeGreaterThan(2);
    expect(fadeSteps.every((v, i, all) => i === 0 || v <= (all[i - 1] ?? Infinity))).toBe(true);
    expect(fadeSteps.some((v) => v > 0 && v < 1)).toBe(true);
    expect(fadeSteps.at(-1)).toBe(0);
    expect(order.indexOf('volume:0')).toBeLessThan(order.indexOf('pause'));
    expect(order.indexOf('pause')).toBeLessThan(order.lastIndexOf('volume:1'));
    expect(volumes.at(-1)).toBe(1);
  });

  it('sets the timer to off after it completes', () => {
    sleep().choose('minutes30');
    jest.advanceTimersByTime(30 * MINUTE + FADE_MS);

    expect(sleep()).toMatchObject({ mode: 'off', endsAtMs: null, fading: false });
  });

  it('reports the remaining minutes, rounded up, while armed', () => {
    sleep().choose('minutes30');
    jest.advanceTimersByTime(MINUTE + 1_000);

    expect(selectRemainingMinutes(sleep())).toBe(29);
  });
});

describe('cancel', () => {
  it('turns the timer off before the deadline and never pauses', () => {
    sleep().choose('minutes15');
    jest.advanceTimersByTime(MINUTE);
    sleep().choose('off');
    jest.advanceTimersByTime(60 * MINUTE);

    expect(pause).not.toHaveBeenCalled();
    expect(sleep().mode).toBe('off');
    expect(selectRemainingMinutes(sleep())).toBeNull();
  });

  it('restores the volume when cancelled during a fade', () => {
    sleep().choose('minutes15');
    jest.advanceTimersByTime(15 * MINUTE + 1_000);
    expect(sleep().fading).toBe(true);
    expect(volumes.at(-1)).toBeLessThan(1);

    sleep().choose('off');

    expect(volumes.at(-1)).toBe(1);
    expect(pause).not.toHaveBeenCalled();
  });
});

describe('end of surah', () => {
  it('arms on the loaded surah and pauses and seeks to 0 when the surah changes', async () => {
    sleep().choose('endOfSurah');
    expect(sleep()).toMatchObject({ mode: 'endOfSurah', armedChapterId: 1 });

    usePlayerStore.setState({ chapterId: 2 });
    await Promise.resolve();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(0);
    expect(sleep().mode).toBe('off');
  });

  it('does nothing while the surah is unchanged', async () => {
    sleep().choose('endOfSurah');
    usePlayerStore.setState({ status: 'paused', positionMs: 5_000 });
    await Promise.resolve();

    expect(pause).not.toHaveBeenCalled();
    expect(sleep().mode).toBe('endOfSurah');
  });

  it('stays off when no surah is loaded', () => {
    usePlayerStore.setState({ chapterId: null });
    sleep().choose('endOfSurah');

    expect(sleep().mode).toBe('off');
  });

  it('is not triggered by a timed mode\'s own chapter changes', async () => {
    sleep().choose('minutes15');
    usePlayerStore.setState({ chapterId: 2 });
    await Promise.resolve();

    expect(pause).not.toHaveBeenCalled();
    expect(sleep().mode).toBe('minutes15');
  });
});

describe('foreground and background', () => {
  it('pauses at once when the deadline passed while the app was in the background', () => {
    sleep().choose('minutes15');
    appStateHandler?.('background');

    // Time passes with no JS running: the app comes back 20 minutes later.
    jest.setSystemTime(new Date(START.getTime() + 20 * MINUTE));
    appStateHandler?.('active');

    expect(pause).toHaveBeenCalledTimes(1);
    expect(order.at(-1)).toBe('volume:1');
    expect(sleep().mode).toBe('off');
  });

  it('keeps counting down after returning before the deadline', () => {
    sleep().choose('minutes30');
    jest.advanceTimersByTime(5 * MINUTE);
    appStateHandler?.('background');

    jest.setSystemTime(new Date(START.getTime() + 10 * MINUTE));
    appStateHandler?.('active');

    expect(pause).not.toHaveBeenCalled();
    expect(selectRemainingMinutes(sleep())).toBe(20);
    jest.advanceTimersByTime(20 * MINUTE + FADE_MS);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('stops the tick while in the background', () => {
    sleep().choose('minutes15');
    appStateHandler?.('background');

    jest.setSystemTime(new Date(START.getTime() + 15 * MINUTE + FADE_MS + 1_000));
    jest.advanceTimersByTime(60_000);

    expect(pause).not.toHaveBeenCalled();
  });
});

