import { FADE_MS } from '@/features/audio/sleep-timer';

import { useAzkarPlayerStore } from './azkarPlayerStore';
import { azkarSleepRemainingMinutes, chooseAzkarSleep, resetAzkarSleepForTests, tickAzkarSleep } from './sleep-timer';
import { pauseAzkarPlayback, resetAzkarPlaybackForTests, startAzkarQueue } from './playback';
import { buildAzkarQueue } from './queue';
import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import type { ReaderUnit } from '../data/reader-units';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
    setPlaybackRate: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/audio/player', () => ({ pause: jest.fn() }));

const MINUTE = 60_000;
const START = 1_000_000;

const unit: ReaderUnit = {
  unitKey: 'u1',
  entryKey: 'fixture:entry-1',
  kind: 'recitation',
  requiredCount: 3,
  variations: [],
  activeVariation: '',
  preface: [],
  body: [],
  afterword: [],
};

beforeEach(() => {
  resetAzkarSleepForTests();
  resetAzkarPlaybackForTests();
});

describe('azkarSleepRemainingMinutes', () => {
  it('rounds the minutes left up, and is null when no timer is armed', () => {
    expect(azkarSleepRemainingMinutes(START + 15 * MINUTE, START)).toBe(15);
    expect(azkarSleepRemainingMinutes(START + 61_000, START)).toBe(2);
    expect(azkarSleepRemainingMinutes(null, START)).toBeNull();
  });
});

describe('the timed sleep', () => {
  it('arms the chosen minutes', () => {
    chooseAzkarSleep('minutes15', START);
    expect(useAzkarPlayerStore.getState()).toMatchObject({ sleepMode: 'minutes15', sleepEndsAtMs: START + 15 * MINUTE });
  });

  it('fades the volume over the last FADE_MS, then pauses and restores full volume', () => {
    const queue = buildAzkarQueue([unit], () => makeRecording());
    startAzkarPlayback_forTest(queue);
    chooseAzkarSleep('minutes15', START);

    tickAzkarSleep(START + 15 * MINUTE + FADE_MS / 2);
    expect(useAzkarPlayerStore.getState()).toMatchObject({ sleepFading: true });
    expect(useAzkarPlayerStore.getState().volume).toBeCloseTo(0.5);

    tickAzkarSleep(START + 15 * MINUTE + FADE_MS);
    const after = useAzkarPlayerStore.getState();
    expect(after).toMatchObject({ sleepMode: 'off', sleepEndsAtMs: null, sleepFading: false, volume: 1, status: 'paused' });
  });

  it('does nothing before the deadline except refresh the clock', () => {
    chooseAzkarSleep('minutes30', START);
    tickAzkarSleep(START + 10 * MINUTE);
    expect(useAzkarPlayerStore.getState()).toMatchObject({ sleepMode: 'minutes30', sleepFading: false, volume: 1 });
    expect(useAzkarPlayerStore.getState().sleepNowMs).toBe(START + 10 * MINUTE);
  });

  it('choosing off cancels a timer, and restores the volume when it was fading', () => {
    chooseAzkarSleep('minutes15', START);
    tickAzkarSleep(START + 15 * MINUTE + FADE_MS / 2);
    chooseAzkarSleep('off', START + 16 * MINUTE);
    expect(useAzkarPlayerStore.getState()).toMatchObject({ sleepMode: 'off', sleepEndsAtMs: null, volume: 1, sleepFading: false });
  });

  it('end of dhikr is armed without a deadline and does not fade', () => {
    chooseAzkarSleep('endOfUnit', START);
    expect(useAzkarPlayerStore.getState()).toMatchObject({ sleepMode: 'endOfUnit', sleepEndsAtMs: null });
    tickAzkarSleep(START + 60 * MINUTE);
    expect(useAzkarPlayerStore.getState().sleepMode).toBe('endOfUnit');
  });
});

describe('pausing from the sleep timer', () => {
  it('pauses a playing recording when the timer completes', () => {
    startAzkarPlayback_forTest(buildAzkarQueue([unit], () => makeRecording()));
    chooseAzkarSleep('minutes15', START);
    tickAzkarSleep(START + 15 * MINUTE + FADE_MS);
    expect(useAzkarPlayerStore.getState().status).toBe('paused');
    // A second pause does nothing once paused.
    pauseAzkarPlayback();
    expect(useAzkarPlayerStore.getState().status).toBe('paused');
  });
});

/** Starts a queue in the playback engine, so the timer has a playing recording to pause. */
function startAzkarPlayback_forTest(queue: ReturnType<typeof buildAzkarQueue>): void {
  startAzkarQueue({ scope: { scopeKey: 'category:fixture', periodKey: 'session', title: 'FIXTURE' }, queue, index: 0 });
}
