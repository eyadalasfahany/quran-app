import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildWidgetSnapshot } from './build-snapshot';
import { snapshotContent } from './sync';
import { fullSnapshot, TEST_LABELS } from './test-fixtures';
import type { WidgetSnapshot } from './types';

/**
 * ADR 0035 §1.1 and §1.2: a snapshot holds ids, counts, times, labels and the surah, ayah and page of the reading place.
 * It never holds Quran text, dhikr text or a generated line. The fixtures use placeholders only, so a leak shows in a
 * failing assertion.
 */
const PLACEHOLDER_DHIKR = 'FIXTURE text 1 — not a dhikr';
const PLACEHOLDER_VERSE = 'نص تجريبي ١ — ليس ذكرًا';

// The widget keys the snapshot may carry. A new key is a schema change and needs this list (and the Swift decoder) to move.
const ALLOWED_TOP_LEVEL = [
  'azkar',
  'colorMode',
  'labels',
  'locale',
  'misbaha',
  'prayer',
  'progress',
  'reading',
  'schemaVersion',
  'wird',
  'writtenAt',
];

/** Every string value in the snapshot, with its path, so a leak names the field that carries it. */
function stringLeaves(value: unknown, path = '$'): { path: string; text: string }[] {
  if (typeof value === 'string') {
    return [{ path, text: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => stringLeaves(item, `${path}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, `${path}.${key}`));
  }
  return [];
}

const VERSE_KEY = /^[1-9]\d*:[1-9]\d*$/;

describe('widget snapshot holds no religious text (ADR 0035 §1)', () => {
  // The placeholder content that a real build would carry: session display names, the reading place and the wird.
  const snapshot: WidgetSnapshot = fullSnapshot({
    azkar: {
      sessions: [
        { complete: true, done: 10, id: 'morning', title: 'SESSION one', total: 10 },
        { complete: false, done: 6, id: 'evening', title: 'SESSION two', total: 24 },
      ],
    },
  });
  const json = JSON.stringify(snapshot);

  it('contains none of the placeholder dhikr or verse strings', () => {
    expect(json).not.toContain(PLACEHOLDER_DHIKR);
    expect(json).not.toContain(PLACEHOLDER_VERSE);
  });

  it('carries only the schema keys at the top level', () => {
    expect(Object.keys(snapshot).sort()).toEqual([...ALLOWED_TOP_LEVEL].sort());
  });

  it('writes the reading place as a verse key and numbers only, never ayah text', () => {
    const reading = snapshot.reading;
    expect(reading).not.toBeNull();
    expect(Object.keys(reading ?? {}).sort()).toEqual(['ayah', 'page', 'surah', 'verseKey']);
    expect(reading?.verseKey).toMatch(VERSE_KEY);
    expect(typeof reading?.ayah).toBe('number');
    expect(typeof reading?.page).toBe('number');
  });

  it('draws every string from a label, an id, a key, a surah name, a place or a progress row', () => {
    const labelValues = new Set<string>(Object.values(TEST_LABELS));
    const allowed = new Set<string>([
      ...labelValues,
      snapshot.colorMode,
      snapshot.locale,
      ...(snapshot.azkar?.sessions.flatMap((session) => [session.id, session.title]) ?? []),
      ...snapshot.prayer.entries.map((entry) => entry.key),
      ...snapshot.progress.rows.flatMap((row) => [row.key, row.label, row.value]),
      snapshot.reading?.surah ?? '',
      snapshot.reading?.verseKey ?? '',
      snapshot.prayer.place ?? '',
    ]);
    const unexpected = stringLeaves(snapshot).filter((leaf) => !allowed.has(leaf.text) && !/^\d/.test(leaf.text));
    expect(unexpected).toEqual([]);
  });

  it('rebuilding it from its own fields gives the same bytes, so the builder adds nothing', () => {
    const rebuilt = buildWidgetSnapshot({
      azkar: snapshot.azkar,
      colorMode: snapshot.colorMode,
      labels: snapshot.labels,
      locale: snapshot.locale,
      misbaha: snapshot.misbaha,
      now: snapshot.writtenAt,
      prayer: snapshot.prayer,
      progress: snapshot.progress,
      reading: snapshot.reading,
      wird: snapshot.wird,
    });
    expect(JSON.parse(snapshotContent(rebuilt))).toEqual(JSON.parse(snapshotContent(snapshot)));
  });
});

describe('widget renderers never read verse text', () => {
  const renderersDir = join(__dirname, '..', 'android');
  const renderers = readdirSync(renderersDir).filter(
    (name) => /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name),
  );

  it.each(renderers)('%s does not reach for verse text', (name) => {
    const source = readFileSync(join(renderersDir, name), 'utf8');
    expect(source).not.toMatch(/textUthmani|text_uthmani|verseText|verse\.text|getVerse|reader\/data\/verses/);
  });
});
