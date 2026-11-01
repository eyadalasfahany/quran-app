import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { pause as pauseQuranPlayback } from '@/features/audio/player';

import { playAzkarRecording } from './playback';
import { startAzkarPlayback } from './start';

jest.mock('@/features/audio/player', () => ({
  pause: jest.fn(),
}));

jest.mock('./playback', () => ({
  playAzkarRecording: jest.fn(() => true),
}));

describe('startAzkarPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pauses Quran audio through its public pause, then starts the recording', () => {
    const recording = makeRecording();
    const onEnded = jest.fn();

    expect(startAzkarPlayback(recording, 'stream', { unitKey: 'u1', onEnded })).toBe(true);

    expect(pauseQuranPlayback).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).toHaveBeenCalledWith(recording, 'stream', { unitKey: 'u1', onEnded });
    expect(jest.mocked(pauseQuranPlayback).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(playAzkarRecording).mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('starts a local recording the same way', () => {
    startAzkarPlayback(makeRecording({ downloadAllowed: true }), 'local', { unitKey: 'u1' });
    expect(pauseQuranPlayback).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).toHaveBeenCalledTimes(1);
  });

  it('neither pauses Quran nor starts anything when playback is not allowed', () => {
    expect(startAzkarPlayback(makeRecording(), 'none', { unitKey: 'u1' })).toBe(false);
    expect(startAzkarPlayback(makeRecording(), 'stream_offline', { unitKey: 'u1' })).toBe(false);
    expect(pauseQuranPlayback).not.toHaveBeenCalled();
    expect(playAzkarRecording).not.toHaveBeenCalled();
  });
});
