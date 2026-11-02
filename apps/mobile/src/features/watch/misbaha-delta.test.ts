import { mergeWatchMisbahaDeltas, type WatchMisbahaDelta } from './misbaha-delta';

const now = new Date(2026, 10, 2, 12, 0);

function delta(partial: Partial<WatchMisbahaDelta> & Pick<WatchMisbahaDelta, 'seq' | 'taps'>): WatchMisbahaDelta {
  return {
    date: '2026-11-02',
    installId: 'watch-1',
    source: 'watch',
    ...partial,
  };
}

describe('mergeWatchMisbahaDeltas', () => {
  it('adds positive taps for today only', () => {
    const result = mergeWatchMisbahaDeltas({
      deltas: [delta({ seq: 1, taps: 3 })],
      mergeState: { lastSeqByInstallId: {} },
      now,
    });
    expect(result.tapsToAdd).toBe(3);
    expect(result.mergeState.lastSeqByInstallId).toEqual({ 'watch-1': 1 });
  });

  it('dedupes by install id and seq', () => {
    const first = mergeWatchMisbahaDeltas({
      deltas: [delta({ seq: 2, taps: 1 })],
      mergeState: { lastSeqByInstallId: {} },
      now,
    });
    const second = mergeWatchMisbahaDeltas({
      deltas: [delta({ seq: 2, taps: 5 }), delta({ seq: 3, taps: 1 })],
      mergeState: first.mergeState,
      now,
    });
    expect(second.tapsToAdd).toBe(1);
    expect(second.mergeState.lastSeqByInstallId['watch-1']).toBe(3);
  });

  it('drops yesterday and invalid payloads', () => {
    const result = mergeWatchMisbahaDeltas({
      deltas: [
        delta({ date: '2026-11-01', seq: 1, taps: 9 }),
        { source: 'watch', installId: 'x', seq: 1, date: '2026-11-02', taps: 0 },
        null,
      ],
      mergeState: { lastSeqByInstallId: {} },
      now,
    });
    expect(result.tapsToAdd).toBe(0);
  });

  it('merges two installs independently', () => {
    const result = mergeWatchMisbahaDeltas({
      deltas: [
        delta({ installId: 'a', seq: 1, taps: 2 }),
        delta({ installId: 'b', seq: 1, taps: 4 }),
      ],
      mergeState: { lastSeqByInstallId: {} },
      now,
    });
    expect(result.tapsToAdd).toBe(6);
  });
});
