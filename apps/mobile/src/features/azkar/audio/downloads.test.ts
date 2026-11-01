import { makeDownloadEntry, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { megabytes, NoAudioDownloadPort, percentOf } from './downloads';

describe('NoAudioDownloadPort', () => {
  it('reports nothing downloadable, nothing stored and no status', () => {
    expect(NoAudioDownloadPort.list()).toEqual([]);
    expect(NoAudioDownloadPort.status('fixture:recording-001')).toBeNull();
    expect(NoAudioDownloadPort.storageBytes()).toBe(0);
  });

  it('ignores every action', () => {
    const recording = makeRecording({ downloadAllowed: true });
    expect(() => {
      NoAudioDownloadPort.enqueue(recording);
      NoAudioDownloadPort.cancel(recording.recordingKey);
      NoAudioDownloadPort.remove(recording.recordingKey);
      NoAudioDownloadPort.removeCategory('fixture-category');
    }).not.toThrow();
    expect(NoAudioDownloadPort.list()).toEqual([]);
  });
});

describe('megabytes', () => {
  it('rounds to one decimal place', () => {
    expect(megabytes(12 * 1024 * 1024)).toBe(12);
    expect(megabytes(4_404_019)).toBe(4.2);
    expect(megabytes(1024 * 1024 + 52_429)).toBe(1.1);
  });

  it('is zero for nothing, negative or non-finite sizes', () => {
    expect(megabytes(0)).toBe(0);
    expect(megabytes(-10)).toBe(0);
    expect(megabytes(Number.NaN)).toBe(0);
    expect(megabytes(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('percentOf', () => {
  it('turns a fraction into a whole percent clamped to 0 to 100', () => {
    expect(percentOf(0.6)).toBe(60);
    expect(percentOf(0)).toBe(0);
    expect(percentOf(1)).toBe(100);
    expect(percentOf(1.7)).toBe(100);
    expect(percentOf(-0.2)).toBe(0);
    expect(percentOf(Number.NaN)).toBe(0);
  });

  it('is used for the done entry shape too', () => {
    expect(percentOf(makeDownloadEntry().progress)).toBe(100);
  });
});
