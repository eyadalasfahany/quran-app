import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildWidgetSnapshot } from './build-snapshot';
import { parseWidgetSnapshot } from './select';
import type { WidgetSnapshot } from './types';

// Golden snapshots for the Swift and Kotlin decoders (ADR 0035 §6). The same files are read by XCTest later.
const FIXTURE_DIR = join(process.cwd(), 'src/features/widgets/snapshot/__fixtures__');
const load = (name: string): WidgetSnapshot =>
  JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8')) as WidgetSnapshot;

describe('golden widget snapshots', () => {
  it.each(['full.json', 'no-location-no-plan.json'])('%s is a valid version 1 snapshot', (name) => {
    const text = readFileSync(join(FIXTURE_DIR, name), 'utf8');
    expect(parseWidgetSnapshot(text)).not.toBeNull();
  });

  it.each(['full.json', 'no-location-no-plan.json'])('%s is what the builder writes for its own content', (name) => {
    const fixture = load(name);
    const rebuilt = buildWidgetSnapshot({
      azkar: fixture.azkar,
      colorMode: fixture.colorMode,
      labels: fixture.labels,
      locale: fixture.locale,
      misbaha: fixture.misbaha,
      now: fixture.writtenAt,
      prayer: fixture.prayer,
      progress: fixture.progress,
      reading: fixture.reading,
      wird: fixture.wird,
    });
    expect(rebuilt).toEqual(fixture);
  });

  it('holds no coordinate and no Quran or dhikr text beyond the surah name', () => {
    const json = readFileSync(join(FIXTURE_DIR, 'full.json'), 'utf8');
    expect(json).not.toMatch(/"(lat|lng)"/);
    expect(Object.keys(load('full.json').reading ?? {}).sort()).toEqual(['ayah', 'page', 'surah', 'verseKey']);
  });
});
