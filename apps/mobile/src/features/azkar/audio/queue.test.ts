import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import type { ReaderUnit } from '../data/reader-units';
import { buildAzkarQueue, queueStartIndex, repetitionOf, runPlays } from './queue';

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

describe('buildAzkarQueue', () => {
  it('keeps the units that have a recording, in reader order, and skips the rest', () => {
    const units = [unit('a', 3), unit('b', 1), unit('c', null), unit('d', 2)];
    const recordings = new Map([
      ['a', makeRecording({ recordingKey: 'rec-a' })],
      ['c', makeRecording({ recordingKey: 'rec-c' })],
    ]);

    const queue = buildAzkarQueue(units, (candidate) => recordings.get(candidate.unitKey) ?? null);

    expect(queue.map((item) => item.unitKey)).toEqual(['a', 'c']);
    expect(queue.map((item) => item.unitIndex)).toEqual([0, 2]);
    expect(queue[0]?.requiredCount).toBe(3);
    expect(queue[1]?.requiredCount).toBeNull();
  });

  it('is empty when no unit has a recording', () => {
    expect(buildAzkarQueue([unit('a', 1)], () => null)).toEqual([]);
  });
});

describe('queueStartIndex', () => {
  const queue = buildAzkarQueue([unit('a', 1), unit('b', 1), unit('c', 1)], (candidate) =>
    candidate.unitKey === 'b' || candidate.unitKey === 'c' ? makeRecording({ recordingKey: candidate.unitKey }) : null,
  );

  it('starts at the reader unit when it has a recording', () => {
    expect(queueStartIndex(queue, 1)).toBe(0);
  });

  it('starts at the next recorded unit when the reader unit has none', () => {
    expect(queueStartIndex(queue, 0)).toBe(0);
  });

  it('starts at the beginning when no recorded unit comes after the reader unit', () => {
    expect(queueStartIndex(queue, 5)).toBe(0);
  });

  it('is -1 for an empty queue', () => {
    expect(queueStartIndex([], 0)).toBe(-1);
  });
});

describe('runPlays', () => {
  it('plays the sourced count by default', () => {
    expect(runPlays('count', 3, 0)).toBe(3);
  });

  it('plays what the count still needs when some repetitions are counted', () => {
    expect(runPlays('count', 3, 2)).toBe(1);
  });

  it('plays once for a unit with no sourced count, and once when the count is already complete', () => {
    expect(runPlays('count', null, 0)).toBe(1);
    expect(runPlays('count', 3, 3)).toBe(1);
  });

  it('plays once in once mode, and loops forever in continuous mode', () => {
    expect(runPlays('once', 5, 0)).toBe(1);
    expect(runPlays('continuous', 5, 0)).toBeNull();
    expect(runPlays('continuous', null, 0)).toBeNull();
  });
});

describe('repetitionOf', () => {
  it('shows the play in progress against the sourced count', () => {
    expect(repetitionOf(3, 0, 0)).toEqual({ current: 1, total: 3 });
    expect(repetitionOf(3, 0, 1)).toEqual({ current: 2, total: 3 });
  });

  it('starts from the counted repetitions and never passes the count', () => {
    expect(repetitionOf(3, 2, 0)).toEqual({ current: 3, total: 3 });
    expect(repetitionOf(3, 3, 0)).toEqual({ current: 3, total: 3 });
  });

  it('is null without a sourced count', () => {
    expect(repetitionOf(null, 0, 4)).toBeNull();
  });
});
