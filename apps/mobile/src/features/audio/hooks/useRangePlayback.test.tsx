import { act } from '@testing-library/react-native';
import { useEffect } from 'react';

import { renderUi } from '../../../../jest/render-ui';
import { usePlayerStore, initialPlayerState } from '../playerStore';
import { catalogueReciter, playRange } from '../play-verse';
import { pause, resume } from '../player';
import { rangePlayability, type RangePlayability } from '../range-availability';

import { useRangePlayback, type RangePlayback } from './useRangePlayback';

// Verse ids and keys are fixtures. The module boundaries are mocked, so the state machine is what runs here.

const mockIds: Record<string, number> = { '2:2': 9, '2:3': 10, '2:4': 11, '2:5': 12 };

jest.mock('@/core/db/content/open', () => ({ openContentDb: () => ({ executor: {} }) }));
jest.mock('@/features/reader/data/verses', () => ({
  verseKeyToId: (_db: unknown, key: string) => mockIds[key],
}));
jest.mock('../play-verse', () => ({
  catalogueReciter: jest.fn(() => ({ resourceId: 30 })),
  playRange: jest.fn(() => Promise.resolve()),
}));
jest.mock('../player', () => ({
  pause: jest.fn(),
  resume: jest.fn(() => Promise.resolve()),
}));
jest.mock('../range-availability', () => ({
  rangePlayability: jest.fn(() => 'ok'),
}));

const mockAvailability = rangePlayability as jest.Mock;
const RANGE = { chapterId: 2, fromVerseId: 9, toVerseId: 10 };
const OTHER = { chapterId: 2, fromVerseId: 11, toVerseId: 12 };

/** Reports each render's value to the test, after the commit. */
function Probe({
  fromKey,
  toKey,
  onValue,
}: {
  fromKey: string | null;
  toKey: string | null;
  onValue: (value: RangePlayback) => void;
}) {
  const value = useRangePlayback(fromKey, toKey);
  useEffect(() => {
    onValue(value);
  });
  return null;
}

/** Renders the hook for the range 2:2 to 2:3 (or the given keys) and returns a reader of its latest value. */
async function mount(fromKey: string | null = '2:2', toKey: string | null = '2:3'): Promise<() => RangePlayback> {
  const values: RangePlayback[] = [];
  await renderUi(<Probe fromKey={fromKey} onValue={(value) => values.push(value)} toKey={toKey} />);
  return () => {
    const latest = values.at(-1);
    if (latest === undefined) {
      throw new Error('The hook has not rendered.');
    }
    return latest;
  };
}

async function setPlayer(state: Partial<typeof initialPlayerState>): Promise<void> {
  await act(async () => {
    usePlayerStore.setState({ ...initialPlayerState, ...state });
  });
}

async function tap(get: () => RangePlayback): Promise<void> {
  await act(async () => {
    get().toggle();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().reset();
  mockAvailability.mockImplementation((): RangePlayability => 'ok');
});

describe('useRangePlayback: idle and availability', () => {
  it('is idle when the range can play, and a tap plays the range', async () => {
    const get = await mount();

    expect(get()).toEqual({ state: 'idle', activeVerseId: null, errorCode: null, toggle: expect.any(Function) });

    await tap(get);

    expect(playRange).toHaveBeenCalledWith('2:2', '2:3');
    expect(catalogueReciter).toHaveBeenCalled();
    expect(rangePlayability).toHaveBeenCalledWith({}, 30, '2:2', '2:3');
  });

  it('stays enabled when the pack is not installed yet, since a tap installs it first', async () => {
    mockAvailability.mockImplementation((): RangePlayability => 'not-installed');
    const get = await mount();

    expect(get().state).toBe('idle');
  });

  it('is unavailable with no timings: the tap does nothing, and the code is no-timings', async () => {
    mockAvailability.mockImplementation((): RangePlayability => 'no-timings');
    const get = await mount();

    expect(get()).toMatchObject({ state: 'unavailable', errorCode: 'no-timings' });

    await tap(get);

    expect(playRange).not.toHaveBeenCalled();
  });

  it.each([
    ['surah-unavailable', 'surah-unavailable'],
    ['no-reciter', 'no-reciter'],
    ['not-recorded', 'invalid-verse'],
    ['invalid', 'invalid-verse'],
  ] as const)('maps %s to the %s code', async (availability, code) => {
    mockAvailability.mockImplementation((): RangePlayability => availability);
    const get = await mount();

    expect(get()).toMatchObject({ state: 'unavailable', errorCode: code });
  });

  it('is unavailable for a dua that is not loaded (no keys)', async () => {
    const get = await mount(null, null);

    expect(get().state).toBe('unavailable');
  });
});

describe('useRangePlayback: this range playing', () => {
  it('is playing for this range, with the ayah being recited highlighted', async () => {
    await setPlayer({ status: 'playing', rangePlay: RANGE, activeVerseId: 10, chapterId: 2 });
    const get = await mount();

    expect(get()).toMatchObject({ state: 'playing', activeVerseId: 10, errorCode: null });
  });

  it('a second tap pauses it, and does not play it again', async () => {
    await setPlayer({ status: 'playing', rangePlay: RANGE, activeVerseId: 9, chapterId: 2 });
    const get = await mount();

    await tap(get);

    expect(pause).toHaveBeenCalledTimes(1);
    expect(playRange).not.toHaveBeenCalled();
  });

  it('is paused for this range, and a tap resumes it', async () => {
    await setPlayer({ status: 'paused', rangePlay: RANGE, activeVerseId: 9, chapterId: 2 });
    const get = await mount();

    expect(get().state).toBe('paused');

    await tap(get);

    expect(resume).toHaveBeenCalledTimes(1);
    expect(playRange).not.toHaveBeenCalled();
  });

  it('shows starting from the tap, and a second tap while it starts does nothing', async () => {
    const get = await mount();

    await act(async () => {
      usePlayerStore.getState().beginStarting({ kind: 'range', fromKey: '2:2', toKey: '2:3' });
    });

    expect(get().state).toBe('starting');

    await tap(get);

    expect(playRange).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });

  it('shows starting while this range loads', async () => {
    await setPlayer({ status: 'loading', rangePlay: RANGE, chapterId: 2 });
    const get = await mount();

    expect(get().state).toBe('starting');
  });
});

describe('useRangePlayback: other ranges and other plays', () => {
  it('highlights no verse, and offers play, while another range plays', async () => {
    await setPlayer({ status: 'playing', rangePlay: OTHER, activeVerseId: 11, chapterId: 2 });
    const get = await mount();

    expect(get()).toMatchObject({ state: 'idle', activeVerseId: null });
  });

  it('highlights no verse while a surah without a range plays', async () => {
    await setPlayer({ status: 'playing', rangePlay: null, activeVerseId: 9, chapterId: 2 });
    const get = await mount();

    expect(get()).toMatchObject({ state: 'idle', activeVerseId: null });
  });
});

describe('useRangePlayback: errors', () => {
  it('shows the error of its own failed play, with the player code', async () => {
    const get = await mount();

    await tap(get);
    await act(async () => {
      usePlayerStore.getState().markFailed('offline');
    });

    expect(get()).toMatchObject({ state: 'error', errorCode: 'offline' });
  });

  it('does not show an error that came from another play', async () => {
    await setPlayer({ status: 'error', error: 'load-failed' });
    const get = await mount();

    expect(get()).toMatchObject({ state: 'idle', errorCode: null });
  });

  it('offers play again after an error', async () => {
    const get = await mount();
    await tap(get);
    await act(async () => {
      usePlayerStore.getState().markFailed('load-failed');
    });

    await tap(get);

    expect(playRange).toHaveBeenCalledTimes(2);
  });
});
