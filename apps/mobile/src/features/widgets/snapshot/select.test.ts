import { parseWidgetSnapshot, prayerStateAt } from './select';
import { fullSnapshot } from './test-fixtures';

describe('prayerStateAt', () => {
  const prayer = fullSnapshot().prayer;

  it('returns the first instant after now', () => {
    const at = new Date(2026, 10, 2, 12, 0).getTime();
    expect(prayerStateAt(prayer, at)).toEqual({
      at: new Date(2026, 10, 2, 13, 47).getTime(),
      key: 'asr',
      kind: 'next',
    });
  });

  it('is stale when every stored instant has passed', () => {
    expect(prayerStateAt(prayer, new Date(2026, 11, 20).getTime())).toEqual({ kind: 'stale' });
  });

  it('asks for a location when there are no instants', () => {
    expect(prayerStateAt({ entries: [], place: null, validUntil: null }, 0)).toEqual({ kind: 'noLocation' });
  });
});

describe('parseWidgetSnapshot', () => {
  it('reads a version 1 snapshot back', () => {
    const snapshot = fullSnapshot();
    expect(parseWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('returns null for a missing value, invalid JSON and another major version', () => {
    expect(parseWidgetSnapshot(undefined)).toBeNull();
    expect(parseWidgetSnapshot(null)).toBeNull();
    expect(parseWidgetSnapshot('{not json')).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...fullSnapshot(), schemaVersion: 2 }))).toBeNull();
  });

  it('returns null when a block the widgets draw is missing', () => {
    const { progress: _progress, ...withoutProgress } = fullSnapshot();
    expect(parseWidgetSnapshot(JSON.stringify(withoutProgress))).toBeNull();
  });

  it('ignores fields it does not know', () => {
    const parsed = parseWidgetSnapshot(JSON.stringify({ ...fullSnapshot(), futureField: true }));
    expect(parsed).not.toBeNull();
  });
});
