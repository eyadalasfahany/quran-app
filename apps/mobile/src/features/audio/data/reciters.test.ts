import type { SqlExecutor } from '@/core/db/sql-executor';

import { listReciters, recitationIdForResource } from './reciters';
import { openAudioTestDb } from './test-db';

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  // Catalogue: Afasy (30) and Husary (31), plus a tafsir that must not show up as a reciter.
  executor.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
     (30, 'chapter_recitations', 'Mishari', 'مشاري', 1, 1000, 1),
     (31, 'chapter_recitations', 'Husary', 'الحصري', 1, 2000, 0),
     (21, 'tafsirs', 'Tafsir', 'تفسير', 1, 3000, 0)`,
  );
  // Installed: Afasy (with a recitation and timings), a tafsir, and a recitation the catalogue doesn't list.
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (30, 'chapter_recitations', 1, 'a', 0, 'Mishari', 'مشاري'),
     (21, 'tafsirs', 1, 'b', 0, 'Tafsir', 'تفسير'),
     (50, 'chapter_recitations', 1, 'c', 0, 'Legacy', 'قديم')`,
  );
  executor.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES
     (1, 30, 'Mishari', 'مشاري', 1),
     (2, 50, 'Legacy', 'قديم', 0)`,
  );
  executor.run(`INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 60000, 'mp3')`);
  executor.run(`INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (100, 1, 0, 1000)`);
});

afterEach(() => {
  close();
});

describe('listReciters', () => {
  it('merges catalogue, installed and installed-but-unlisted recitations, sorted by resource id', () => {
    expect(listReciters(executor)).toEqual([
      {
        resourceId: 30,
        name: 'Mishari',
        nameAr: 'مشاري',
        installed: true,
        packSizeBytes: 1000,
        hasTimings: true,
        hasWordSegments: true,
        isDefault: true,
      },
      {
        resourceId: 31,
        name: 'Husary',
        nameAr: 'الحصري',
        installed: false,
        packSizeBytes: 2000,
        hasTimings: false,
        hasWordSegments: false,
        isDefault: false,
      },
      {
        resourceId: 50,
        name: 'Legacy',
        nameAr: 'قديم',
        installed: true,
        packSizeBytes: 0,
        hasTimings: false,
        hasWordSegments: false,
        isDefault: false,
      },
    ]);
  });

  it('reads isDefault from the catalogue flag, and gives installed-but-unlisted recitations false', () => {
    const flags = Object.fromEntries(listReciters(executor).map((reciter) => [reciter.resourceId, reciter.isDefault]));
    expect(flags).toEqual({ 30: true, 31: false, 50: false });
  });

  it('reports no timings for a catalogue-only reciter even when recitation rows exist for other resources', () => {
    const husary = listReciters(executor).find((reciter) => reciter.resourceId === 31);
    expect(husary?.hasTimings).toBe(false);
    expect(husary?.installed).toBe(false);
  });

  it('reports installed but timing-less recitations as having no timings', () => {
    const legacy = listReciters(executor).find((reciter) => reciter.resourceId === 50);
    expect(legacy?.installed).toBe(true);
    expect(legacy?.hasTimings).toBe(false);
  });
});

describe('recitationIdForResource', () => {
  it('maps an installed resource to its recitations.id', () => {
    expect(recitationIdForResource(executor, 30)).toBe(1);
  });

  it('returns undefined when the resource has no recitation row', () => {
    expect(recitationIdForResource(executor, 31)).toBeUndefined();
  });
});
