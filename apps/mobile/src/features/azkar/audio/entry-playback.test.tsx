import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { makeItem, makeUnit } from '../../../../jest/azkar-ui-fixtures';
import * as content from '../data/content-repository';
import { scopeKeyForEntry } from '../data/progress';
import { buildAzkarQueue } from './queue';
import { initialAzkarPlayerState, useAzkarPlayerStore } from './azkarPlayerStore';
import { pauseAzkarPlayback, resumeAzkarPlayback, skipAzkarPlayback, stopAzkarPlayback } from './playback';
import { startAzkarPlayback } from './start';
import { useAzkarEntryPlayback } from './entry-playback';

// Fixture keys and text only: no dua is written here (ADR 0092, the test rules).
const ENTRY_KEY = 'fixture:entry-001';
const SCOPE = scopeKeyForEntry(ENTRY_KEY);
const TITLE = 'FIXTURE category — not a dua';

const mockOnline = jest.fn(() => true);
const mockDownloaded = jest.fn(() => false);

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
}));

jest.mock('../data/content-repository', () => ({
  listRecordingsForItems: jest.fn(() => []),
}));

jest.mock('./hooks', () => {
  const actual = jest.requireActual<typeof import('./hooks')>('./hooks');
  return {
    ...actual,
    useOnline: () => mockOnline(),
    useIsDownloaded: () => mockDownloaded(),
  };
});

jest.mock('./start', () => ({ startAzkarPlayback: jest.fn() }));

jest.mock('./playback', () => ({
  pauseAzkarPlayback: jest.fn(),
  resumeAzkarPlayback: jest.fn(),
  skipAzkarPlayback: jest.fn(),
  stopAzkarPlayback: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

const listRecordings = content.listRecordingsForItems as jest.Mock;
const start = startAzkarPlayback as jest.Mock;

/** One unit with one body item (id 1), as a Hisn entry shows it. */
function units(requiredCount: number | null = 3) {
  return [makeUnit({ unitKey: 'fixture:item-1', entryKey: ENTRY_KEY, requiredCount, body: [makeItem({ id: 1 })] })];
}

async function renderEntry(recordingAvailable = true, requiredCount: number | null = 3) {
  listRecords(recordingAvailable);
  return renderHook(() => useAzkarEntryPlayback({ entryKey: ENTRY_KEY, units: units(requiredCount), title: TITLE }));
}

function listRecords(available: boolean, overrides = {}) {
  listRecordings.mockReturnValue(available ? [makeRecording({ itemId: 1, ...overrides })] : []);
}

/** Puts the player on this entry's queue, playing, the way `startAzkarPlayback` would. */
function playThisEntry(status: 'playing' | 'paused' | 'loading' = 'playing', playsDone = 0, requiredCount: number | null = 3) {
  const recording = makeRecording({ itemId: 1 });
  const queue = buildAzkarQueue(units(requiredCount), () => recording);
  useAzkarPlayerStore.setState({
    ...initialAzkarPlayerState,
    scope: { scopeKey: SCOPE, periodKey: 'session', title: TITLE },
    queue,
    index: 0,
    status,
    positionMs: 12_000,
    durationMs: 65_000,
    countAtStart: 0,
    playsDone,
    runPlays: requiredCount ?? null,
  });
}

describe('useAzkarEntryPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAzkarPlayerStore.setState(initialAzkarPlayerState);
    mockOnline.mockReturnValue(true);
    mockDownloaded.mockReturnValue(false);
  });

  it('gives no recording, no play and no bar for an entry without a recording', async () => {
    const { result } = await renderEntry(false);

    expect(result.current).toEqual({ recording: null, playControl: null, offline: false, bar: null });
  });

  it('offers play for a streamable recording while online, and starts the entry queue from its first item', async () => {
    const { result } = await renderEntry();

    expect(result.current.recording?.itemId).toBe(1);
    expect(result.current.playControl).toEqual({ playing: false, loading: false, onToggle: expect.any(Function) });
    expect(result.current.offline).toBe(false);

    await act(async () => {
      result.current.playControl?.onToggle();
    });

    expect(start).toHaveBeenCalledTimes(1);
    const request = start.mock.calls[0]?.[0];
    expect(request.scope).toEqual({ scopeKey: SCOPE, periodKey: 'session', title: TITLE });
    expect(request.index).toBe(0);
    expect(request.queue).toHaveLength(1);
    expect(request.queue[0].recording.itemId).toBe(1);
  });

  it('hides play and shows the offline state for a streamed recording that is not downloaded while offline', async () => {
    mockOnline.mockReturnValue(false);
    const { result } = await renderEntry();

    expect(result.current.playControl).toBeNull();
    expect(result.current.offline).toBe(true);
    expect(result.current.bar).toBeNull();
  });

  it('offers play offline for a downloaded recording', async () => {
    mockOnline.mockReturnValue(false);
    mockDownloaded.mockReturnValue(true);
    listRecords(true, { downloadAllowed: true });
    const { result } = await renderHook(() => useAzkarEntryPlayback({ entryKey: ENTRY_KEY, units: units(), title: TITLE }));

    expect(result.current.playControl).not.toBeNull();
    expect(result.current.offline).toBe(false);
  });

  it('shows the player bar and the pause control while this entry plays', async () => {
    playThisEntry('playing');
    const { result } = await renderEntry();

    expect(result.current.playControl).toEqual(expect.objectContaining({ playing: true, loading: false }));
    expect(result.current.bar).toEqual(
      expect.objectContaining({
        playing: true,
        positionMs: 12_000,
        durationMs: 65_000,
        repetition: { current: 1, total: 3 },
        canPrevious: true,
        canNext: false,
      }),
    );
  });

  it('pauses while playing and resumes while paused, from the same toggle', async () => {
    playThisEntry('playing');
    const { result } = await renderEntry();

    await act(async () => {
      result.current.playControl?.onToggle();
    });
    expect(pauseAzkarPlayback).toHaveBeenCalledTimes(1);

    playThisEntry('paused');
    const again = await renderEntry();
    await act(async () => {
      again.result.current.playControl?.onToggle();
    });
    expect(resumeAzkarPlayback).toHaveBeenCalledTimes(1);
  });

  it('shows the loading state, with the pause glyph', async () => {
    playThisEntry('loading');
    const { result } = await renderEntry();

    expect(result.current.playControl).toEqual(expect.objectContaining({ playing: false, loading: true }));
  });

  it('draws nothing of its own for another entry that is playing', async () => {
    playThisEntry('playing');
    listRecords(true);
    const { result } = await renderHook(() =>
      useAzkarEntryPlayback({ entryKey: 'fixture:entry-other', units: units(), title: TITLE }),
    );

    expect(result.current.bar).toBeNull();
    expect(result.current.playControl).toEqual(expect.objectContaining({ playing: false }));
  });

  it('moves to the next and previous dhikr of its queue, and opens the full player', async () => {
    playThisEntry('playing');
    const { result } = await renderEntry();

    await act(async () => {
      result.current.bar?.onNext();
      result.current.bar?.onPrevious();
      result.current.bar?.onOpen();
    });

    expect(skipAzkarPlayback).toHaveBeenNthCalledWith(1, 1);
    expect(skipAzkarPlayback).toHaveBeenNthCalledWith(2, -1);
    expect(router.push).toHaveBeenCalledWith('/azkar/player');
  });

  it('stops this entry when the screen leaves it, and leaves another scope alone', async () => {
    playThisEntry('playing');
    const { unmount } = await renderEntry();
    await unmount();
    expect(stopAzkarPlayback).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    playThisEntry('playing');
    useAzkarPlayerStore.setState({ scope: { scopeKey: 'entry:fixture:other', periodKey: 'session', title: TITLE } });
    const other = await renderEntry();
    await other.unmount();
    expect(stopAzkarPlayback).not.toHaveBeenCalled();
  });

  it('shows no repetition for a unit with no sourced count', async () => {
    playThisEntry('playing', 0, null);
    listRecords(true);
    const { result } = await renderHook(() =>
      useAzkarEntryPlayback({ entryKey: ENTRY_KEY, units: units(null), title: TITLE }),
    );

    expect(result.current.bar?.repetition).toBeNull();
  });
});
