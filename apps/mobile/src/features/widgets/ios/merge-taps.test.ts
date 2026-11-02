import { mergeWidgetTapsFromSnapshot, snapshotMisbahaAfterMergedTaps } from './merge-taps';

describe('mergeWidgetTapsFromSnapshot', () => {
  it('applies each new tap once', () => {
    const recordTap = jest.fn();
    const result = mergeWidgetTapsFromSnapshot({
      lastMergedWidgetTaps: 2,
      misbaha: { count: 5, target: 100, todayTotal: 10, widgetTapsTotal: 5 },
      recordTap,
    });
    expect(result).toEqual({ applied: 3, lastMergedWidgetTaps: 5 });
    expect(recordTap).toHaveBeenCalledTimes(3);
  });

  it('does nothing when totals match', () => {
    const recordTap = jest.fn();
    expect(
      mergeWidgetTapsFromSnapshot({
        lastMergedWidgetTaps: 4,
        misbaha: { count: 1, target: null, todayTotal: 4, widgetTapsTotal: 4 },
        recordTap,
      }),
    ).toEqual({ applied: 0, lastMergedWidgetTaps: 4 });
    expect(recordTap).not.toHaveBeenCalled();
  });

  it('treats missing widgetTapsTotal as zero', () => {
    const recordTap = jest.fn();
    expect(
      mergeWidgetTapsFromSnapshot({
        lastMergedWidgetTaps: 0,
        misbaha: { count: 0, target: 33, todayTotal: 0 },
        recordTap,
      }),
    ).toEqual({ applied: 0, lastMergedWidgetTaps: 0 });
  });
});

describe('snapshotMisbahaAfterMergedTaps', () => {
  it('advances the snapshot block like widget taps', () => {
    const base = { count: 32, target: 33, todayTotal: 5, widgetTapsTotal: 2 };
    expect(snapshotMisbahaAfterMergedTaps(base, 1)).toEqual({
      count: 0,
      target: 33,
      todayTotal: 6,
      widgetTapsTotal: 3,
    });
  });
});
