import { act } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio';

import { makeRecording, FIXTURE_RECORDING_URL } from '../../../../jest/azkar-audio-fixtures';
import { usePlayerStore } from '@/features/audio/playerStore';
import { networkIsOffline } from '@/core/network/network-state';

import { getProgressRows, recordTap } from '../data/progress-repository';
import type { AzkarRecording } from '../data/model';
import type { ReaderUnit } from '../data/reader-units';
import { useAzkarPlayerStore, type AzkarPlayerScope } from './azkarPlayerStore';
import type { AzkarDownloadPort } from './downloads';
import { NoAudioDownloadPort } from './downloads';
import {
  claimAzkarPlay,
  pauseAzkarPlayback,
  resetAzkarPlaybackForTests,
  resumeAzkarPlayback,
  seekAzkarPlayback,
  setAzkarRepeatMode,
  setAzkarSpeed,
  skipAzkarPlayback,
  startAzkarQueue,
  stopAzkarPlayback,
} from './playback';
import { buildAzkarQueue, type AzkarQueueItem } from './queue';
import { chooseAzkarSleep, resetAzkarSleepForTests } from './sleep-timer';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/core/network/network-state', () => ({
  networkIsOffline: jest.fn(() => false),
}));

jest.mock('../data/progress-repository', () => ({
  getProgressRows: jest.fn(() => []),
  recordTap: jest.fn(() => ({ accepted: true, completedNow: false })),
}));

type FakePlayer = {
  uri: string;
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  setActiveForLockScreen: jest.Mock;
  clearLockScreenControls: jest.Mock;
  setPlaybackRate: jest.Mock;
  playbackRate: number;
  volume: number;
  emit: (status: Partial<AudioStatus>) => void;
  finish: () => void;
  listenerCount: () => number;
};

/** A stand-in for expo-audio's AudioPlayer. `emit` delivers a status update to its listener. */
function makeFakePlayer(uri: string): FakePlayer {
  const listeners = new Set<(status: AudioStatus) => void>();
  const player: FakePlayer = {
    uri,
    addListener: jest.fn((event: string, listener: (status: AudioStatus) => void) => {
      if (event !== 'playbackStatusUpdate') {
        throw new Error(`Unexpected event ${event}`);
      }
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
    setPlaybackRate: jest.fn((rate: number) => {
      player.playbackRate = rate;
    }),
    playbackRate: 1,
    volume: 1,
    emit: (status) => {
      const full = {
        id: 'fake',
        currentTime: 0,
        duration: 0,
        playing: false,
        didJustFinish: false,
        isLoaded: true,
        ...status,
      } as AudioStatus;
      for (const listener of [...listeners]) {
        listener(full);
      }
    },
    finish: () => {
      player.emit({ didJustFinish: true, playing: false, currentTime: 65, duration: 65 });
    },
    listenerCount: () => listeners.size,
  };
  return player;
}

const createdPlayers: FakePlayer[] = [];
const mockCreatePlayer = createAudioPlayer as unknown as jest.Mock;
const mockRecordTap = recordTap as unknown as jest.Mock;
const mockProgressRows = getProgressRows as unknown as jest.Mock;
const mockOffline = networkIsOffline as unknown as jest.Mock;

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

const SCOPE: AzkarPlayerScope = { scopeKey: 'category:fixture', periodKey: 'session', title: 'FIXTURE scope' };

function unit(unitKey: string, requiredCount: number | null): ReaderUnit {
  return {
    unitKey,
    entryKey: `fixture:${unitKey}`,
    kind: 'recitation',
    requiredCount,
    variations: [],
    activeVariation: '',
    preface: [],
    body: [],
    afterword: [],
  };
}

/** A queue of recorded units, in order. `counts` gives each unit's sourced count. */
function queueOf(counts: (number | null)[], overrides: Partial<AzkarRecording>[] = []): AzkarQueueItem[] {
  const units = counts.map((count, index) => unit(`u${index + 1}`, count));
  const recordings = counts.map((_, index) =>
    makeRecording({ recordingKey: `rec-${index + 1}`, remoteUrl: `${FIXTURE_RECORDING_URL}?n=${index + 1}`, ...overrides[index] }),
  );
  return buildAzkarQueue(units, (candidate) => recordings[units.indexOf(candidate)] ?? null);
}

function startWith(queue: AzkarQueueItem[], index = 0, port?: AzkarDownloadPort): void {
  startAzkarQueue({ scope: SCOPE, queue, index, port });
}

/** The latest player created for the queue item `n` (its test URI ends with `?n=<n>`). */
function playerFor(n: number): FakePlayer {
  const last = createdPlayers.filter((player) => player.uri.endsWith(`?n=${n}`)).at(-1);
  if (last === undefined) {
    throw new Error(`No player for item ${n}`);
  }
  return last;
}

beforeEach(() => {
  jest.useRealTimers();
  createdPlayers.length = 0;
  mockOffline.mockReturnValue(false);
  mockRecordTap.mockClear();
  mockRecordTap.mockReturnValue({ accepted: true, completedNow: false });
  mockProgressRows.mockReset();
  mockProgressRows.mockReturnValue([]);
  mockCreatePlayer.mockReset();
  mockCreatePlayer.mockImplementation((source: { uri: string }) => {
    const player = makeFakePlayer(source.uri);
    createdPlayers.push(player);
    return player;
  });
  (setAudioModeAsync as unknown as jest.Mock).mockClear();
  resetAzkarPlaybackForTests();
  resetAzkarSleepForTests();
  usePlayerStore.getState().reset();
});

afterEach(() => {
  resetAzkarPlaybackForTests();
  resetAzkarSleepForTests();
});

describe('starting a queue', () => {
  it('plays the first recording from its stream URL and reports it loading, then playing', async () => {
    startWith(queueOf([3]));
    await flush();

    expect(mockCreatePlayer).toHaveBeenCalledTimes(1);
    expect(playerFor(1).setPlaybackRate).toHaveBeenCalledWith(1);
    expect(playerFor(1).uri).toBe(`${FIXTURE_RECORDING_URL}?n=1`);
    expect(playerFor(1).play).toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState().status).toBe('playing');
    expect(useAzkarPlayerStore.getState().index).toBe(0);
  });

  it('keeps the Quran store untouched while it plays', async () => {
    const before = usePlayerStore.getState();
    startWith(queueOf([2]));
    await flush();
    expect(usePlayerStore.getState().status).toBe(before.status);
    expect(usePlayerStore.getState().chapterId).toBe(before.chapterId);
  });

  it('plays a downloaded file first, and never streams it', async () => {
    const port: AzkarDownloadPort = { ...NoAudioDownloadPort, localUri: () => 'file:///downloads/rec-1.mp3', status: () => ({
      recording: makeRecording(),
      recordingKey: 'rec-1',
      categoryId: 'category:fixture',
      title: 'FIXTURE',
      state: 'done',
      progress: 1,
      bytes: 10,
    }) };
    startWith(queueOf([2], [{ downloadAllowed: true }]), 0, port);
    await flush();
    expect(createdPlayers.map((player) => player.uri)).toEqual(['file:///downloads/rec-1.mp3']);
  });

  it('sets the lock screen metadata: the scope title, the reciter as artist, and no next or previous', async () => {
    startWith(queueOf([2]));
    await flush();
    expect(playerFor(1).setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'FIXTURE scope', artist: 'FIXTURE reciter' }),
      { showNextTrack: false, showPreviousTrack: false },
    );
  });

  it('stops with the offline error, creating no player, when the recording needs the network and the device is offline', async () => {
    mockOffline.mockReturnValue(true);
    startWith(queueOf([2]));
    await flush();

    expect(mockCreatePlayer).not.toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'error', error: 'offline' });
  });

  it('skips a recording that cannot play (no rights) and starts the next one', async () => {
    const queue = queueOf([2, 2], [{ rightsVerifiedAt: null }, {}]);
    startWith(queue);
    await flush();
    expect(createdPlayers.map((player) => player.uri)).toEqual([`${FIXTURE_RECORDING_URL}?n=2`]);
    expect(useAzkarPlayerStore.getState().index).toBe(1);
  });

  it('ends in the error state when the recording does not load within the timeout', async () => {
    jest.useFakeTimers();
    startWith(queueOf([2]));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
    jest.useRealTimers();
  });
});

describe('repeat by count', () => {
  it('plays a dhikr as many times as its sourced count and counts each completed play once', async () => {
    startWith(queueOf([3]));
    await flush();

    for (let play = 1; play <= 3; play += 1) {
      playerFor(1).finish();
      await flush();
    }

    expect(mockRecordTap).toHaveBeenCalledTimes(3);
    expect(mockRecordTap).toHaveBeenCalledWith('category:fixture', 'session', 'u1', 3);
    // The third play ended the run; the scope has nothing after it.
    expect(useAzkarPlayerStore.getState().status).toBe('finished');
  });

  it('plays only what the count still needs when some repetitions are already counted', async () => {
    mockProgressRows.mockReturnValue([{ scopeKey: 'category:fixture', periodKey: 'session', itemKey: 'u1', currentCount: 2, completedAt: null, updatedAt: 1 }]);
    startWith(queueOf([3]));
    await flush();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ runPlays: 1, countAtStart: 2 });

    playerFor(1).finish();
    await flush();
    expect(mockRecordTap).toHaveBeenCalledTimes(1);
    expect(useAzkarPlayerStore.getState().status).toBe('finished');
  });

  it('counts a play once even when its end event arrives twice', async () => {
    startWith(queueOf([2]));
    await flush();
    const player = playerFor(1);
    player.finish();
    player.finish();
    await flush();
    expect(mockRecordTap).toHaveBeenCalledTimes(1);
  });

  it('a unit with no sourced count plays once and counts as one tap (marks it done)', async () => {
    startWith(queueOf([null]));
    await flush();
    playerFor(1).finish();
    await flush();
    expect(mockRecordTap).toHaveBeenCalledTimes(1);
    expect(mockRecordTap).toHaveBeenCalledWith('category:fixture', 'session', 'u1', null);
  });
});

describe('a tap on the reader claims the play it counted', () => {
  it('does not count the claimed play again, so one repetition is counted once', async () => {
    startWith(queueOf([3]));
    await flush();

    // A tap on the reader counted this repetition (the reader calls recordTap, then claims the play).
    claimAzkarPlay('u1');
    playerFor(1).finish();
    await flush();

    // The claimed play is not counted by the audio, and the run replays for its second repetition.
    expect(mockRecordTap).not.toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'playing', playsDone: 1 });
  });

  it('a claim for another unit changes nothing', async () => {
    startWith(queueOf([2]));
    await flush();
    claimAzkarPlay('some-other-unit');
    playerFor(1).finish();
    await flush();
    expect(mockRecordTap).toHaveBeenCalledTimes(1);
  });

  it('a claim after the play has ended belongs to the next play, not this one', async () => {
    startWith(queueOf([2]));
    await flush();
    playerFor(1).finish();
    await flush();
    claimAzkarPlay('u1');
    playerFor(1).finish();
    await flush();
    expect(mockRecordTap).toHaveBeenCalledTimes(1);
  });
});

describe('repeat modes', () => {
  it('once plays one time, then moves on', async () => {
    startWith(queueOf([3, 2]));
    await flush();
    setAzkarRepeatMode('once');
    playerFor(1).finish();
    await flush();
    expect(useAzkarPlayerStore.getState().index).toBe(1);
    expect(mockRecordTap).toHaveBeenCalledWith('category:fixture', 'session', 'u1', 3);
  });

  it('continuous replays the same dhikr without ending, and counts each loop', async () => {
    startWith(queueOf([2]));
    await flush();
    setAzkarRepeatMode('continuous');
    for (let loop = 0; loop < 3; loop += 1) {
      playerFor(1).finish();
      await flush();
    }
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'playing', index: 0, runPlays: null });
    expect(mockRecordTap).toHaveBeenCalledTimes(3);
  });

  it('changing the mode during a run applies to the run in progress', async () => {
    startWith(queueOf([3, 2]));
    await flush();
    setAzkarRepeatMode('once');
    expect(useAzkarPlayerStore.getState().runPlays).toBe(1);
  });
});

describe('auto-advance', () => {
  it('moves to the next recorded dhikr when a run ends, and plays it', async () => {
    startWith(queueOf([1, 1, 1]));
    await flush();

    playerFor(1).finish();
    await flush();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ index: 1, status: 'playing' });
    expect(createdPlayers.at(-1)?.uri).toBe(`${FIXTURE_RECORDING_URL}?n=2`);

    playerFor(2).finish();
    await flush();
    expect(useAzkarPlayerStore.getState().index).toBe(2);
  });

  it('stops at the end of the scope', async () => {
    startWith(queueOf([1]));
    await flush();
    playerFor(1).finish();
    await flush();
    expect(useAzkarPlayerStore.getState().status).toBe('finished');
    expect(playerFor(1).remove).toHaveBeenCalled();
  });

  it('after the scope has finished, play starts it again from the first dhikr', async () => {
    startWith(queueOf([1]));
    await flush();
    playerFor(1).finish();
    await flush();
    resumeAzkarPlayback();
    await flush();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'playing', index: 0 });
  });
});

describe('transport', () => {
  it('pauses and resumes the recording', async () => {
    startWith(queueOf([3]));
    await flush();
    pauseAzkarPlayback();
    expect(useAzkarPlayerStore.getState().status).toBe('paused');
    expect(playerFor(1).pause).toHaveBeenCalled();
    resumeAzkarPlayback();
    expect(useAzkarPlayerStore.getState().status).toBe('playing');
  });

  it('skips to the next dhikr and back, and previous from the first starts it again', async () => {
    startWith(queueOf([1, 1]));
    await flush();
    skipAzkarPlayback(1);
    await flush();
    expect(useAzkarPlayerStore.getState().index).toBe(1);
    skipAzkarPlayback(-1);
    await flush();
    expect(useAzkarPlayerStore.getState().index).toBe(0);
    skipAzkarPlayback(-1);
    await flush();
    expect(useAzkarPlayerStore.getState().index).toBe(0);
  });

  it('seeks within the loaded recording and clamps to its length', async () => {
    startWith(queueOf([3]));
    await flush();
    seekAzkarPlayback(999_999);
    expect(useAzkarPlayerStore.getState().positionMs).toBe(65_000);
    expect(playerFor(1).seekTo).toHaveBeenCalledWith(65);
  });

  it('applies the speed to the playing recording', async () => {
    startWith(queueOf([3]));
    await flush();
    setAzkarSpeed(1.5);
    expect(playerFor(1).setPlaybackRate).toHaveBeenLastCalledWith(1.5);
    expect(playerFor(1).playbackRate).toBe(1.5);
  });

  it('stopping releases the player and clears the scope, keeping the chosen settings', async () => {
    startWith(queueOf([3]));
    await flush();
    setAzkarSpeed(2);
    stopAzkarPlayback();
    expect(playerFor(1).remove).toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'idle', scope: null, queue: [], speed: 2 });
  });
});

describe('the Quran player', () => {
  it('stops the Azkar recording when Quran audio starts', async () => {
    startWith(queueOf([3]));
    await flush();
    act(() => {
      usePlayerStore.setState({ status: 'playing' });
    });
    expect(useAzkarPlayerStore.getState().status).toBe('idle');
    expect(playerFor(1).remove).toHaveBeenCalled();
  });
});

describe('sleep at the end of a dhikr', () => {
  it('pauses when the current dhikr ends its run, and clears the sleep mode', async () => {
    startWith(queueOf([2, 2]));
    await flush();
    chooseAzkarSleep('endOfUnit');
    playerFor(1).finish();
    await flush();
    expect(playerFor(1).pause).not.toHaveBeenCalled();
    playerFor(1).finish();
    await flush();
    expect(playerFor(1).pause).toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState()).toMatchObject({ status: 'paused', index: 0, sleepMode: 'off' });
  });
});
