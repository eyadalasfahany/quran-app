import { buildWidgetSnapshot, type WidgetSnapshotInput } from './build-snapshot';
import { TEST_LABELS } from './test-fixtures';

const input: WidgetSnapshotInput = {
  azkar: { sessions: [{ complete: false, done: 1, id: 'morning', title: 'SESSION one', total: 4 }] },
  colorMode: 'dark',
  labels: TEST_LABELS,
  locale: 'en',
  misbaha: { count: 7, target: 33, todayTotal: 40 },
  now: 1_800_000_000_000,
  prayer: {
    entries: [{ at: 1_800_000_100_000, key: 'asr' }],
    place: null,
    validUntil: 1_800_000_100_000,
  },
  progress: { percent: 50, rows: [{ done: false, key: 'wird', label: 'ROW', value: 'VALUE' }] },
  reading: { ayah: 255, page: 42, surah: 'SURAH placeholder', verseKey: '2:255' },
  wird: { done: 4, target: 10 },
};

describe('buildWidgetSnapshot', () => {
  it('writes the schema version and the build time', () => {
    const snapshot = buildWidgetSnapshot(input);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.writtenAt).toBe(input.now);
    expect(snapshot.colorMode).toBe('dark');
  });

  it('holds only the reading place: surah, ayah and page, never ayah text', () => {
    const snapshot = buildWidgetSnapshot(input);
    expect(Object.keys(snapshot.reading ?? {}).sort()).toEqual(['ayah', 'page', 'surah', 'verseKey']);
  });

  it('holds no coordinate in any field', () => {
    const json = JSON.stringify(buildWidgetSnapshot(input));
    expect(json).not.toMatch(/"(lat|lng|latitude|longitude|coords)"/);
  });

  it('keeps null where there is no reading, wird or Azkar', () => {
    const snapshot = buildWidgetSnapshot({ ...input, azkar: null, reading: null, wird: null });
    expect(snapshot.azkar).toBeNull();
    expect(snapshot.reading).toBeNull();
    expect(snapshot.wird).toBeNull();
  });

  it('copies its inputs, so a later change to them does not reach the snapshot', () => {
    const snapshot = buildWidgetSnapshot(input);
    input.misbaha.count = 99;
    expect(snapshot.misbaha.count).toBe(7);
    input.misbaha.count = 7;
  });
});
