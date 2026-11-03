import { pause as pauseQuranPlayback } from '@/features/audio/player';
import { createAudioPlayer } from 'expo-audio';

import { makeRecording, FIXTURE_RECORDING_URL } from '../../../../jest/azkar-audio-fixtures';
import type { ReaderUnit } from '../data/reader-units';
import { useAzkarPlayerStore } from './azkarPlayerStore';
import { resetAzkarPlaybackForTests } from './playback';
import { startAzkarPlayback } from './start';
import { buildAzkarQueue } from './queue';

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

jest.mock('@/features/audio/player', () => ({
  pause: jest.fn(),
}));

jest.mock('@/core/network/network-state', () => ({
  networkIsOffline: jest.fn(() => false),
}));

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

const SCOPE = { scopeKey: 'category:fixture', periodKey: 'session', title: 'FIXTURE scope' };

describe('startAzkarPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAzkarPlaybackForTests();
  });

  it('pauses Quran audio through its public pause, then starts the queue', () => {
    const queue = buildAzkarQueue([unit], () => makeRecording());
    startAzkarPlayback({ scope: SCOPE, queue, index: 0 });

    expect(pauseQuranPlayback).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: FIXTURE_RECORDING_URL }, expect.anything());
    expect(useAzkarPlayerStore.getState().scope).toEqual(SCOPE);
  });

  it('neither pauses Quran nor starts anything for an empty queue', () => {
    startAzkarPlayback({ scope: SCOPE, queue: [], index: -1 });

    expect(pauseQuranPlayback).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(useAzkarPlayerStore.getState().status).toBe('idle');
  });
});
