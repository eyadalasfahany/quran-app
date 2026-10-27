import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { importSeedIfNeeded } from '@/core/db/content/seed';

import { applyContentMigrations } from '../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../jest/node-sqlite-executor';
import { getWords } from '@/features/reader/data/words';

import { matchedWordPositions } from './highlight';
import { parseQuery } from './parseQuery';
import { searchQuran } from './searchQuran';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const seedScript = join(process.cwd(), 'scripts/build-content-seed.mjs');

jest.setTimeout(120_000);

let executor: SqlExecutor;
let directory: string;
let seedPath: string;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'search-quran-'));
  seedPath = join(directory, 'tanzil-seed.db');
  execFileSync(process.execPath, [seedScript, seedPath], { cwd: process.cwd() });

  const opened = openNodeSqlite(':memory:');
  executor = opened.executor;
  applyContentMigrations(executor, migrationsDir);
  await importSeedIfNeeded(executor, { path: () => seedPath });
});

afterAll(() => {
  rmSync(directory, { force: true, recursive: true });
});

describe('searchQuran', () => {
  it('finds 1:2 first for «الحمد لله»', () => {
    const page = searchQuran(executor, 'الحمد لله');
    const firstVerse = page.results.find((result) => result.kind === 'verse');
    expect(firstVerse?.kind).toBe('verse');
    if (firstVerse?.kind === 'verse') {
      expect(firstVerse.verse.verseKey).toBe('1:2');
    }
  });

  it('finds 1:2 for «العالمين» (Imla\'i regression)', () => {
    const page = searchQuran(executor, 'العالمين');
    const hit = page.results.find((result) => result.kind === 'verse' && result.verse.verseKey === '1:2');
    expect(hit).toBeDefined();
  });

  it('resolves 2:255 and ٢:٢٥٥', () => {
    const western = searchQuran(executor, '2:255');
    expect(western.results).toHaveLength(1);
    expect(western.results[0]?.kind).toBe('verse');
    if (western.results[0]?.kind === 'verse') {
      expect(western.results[0].verse.verseKey).toBe('2:255');
    }

    const eastern = parseQuery('٢:٢٥٥');
    expect(eastern).toEqual({ kind: 'verse', verseKey: '2:255' });
  });

  it('finds surah 2 for «البقرة»', () => {
    const page = searchQuran(executor, 'البقرة');
    const surah = page.results.find((result) => result.kind === 'surah' && result.chapter.id === 2);
    expect(surah).toBeDefined();
  });

  it('highlights the matched word positions for 1:2', () => {
    const page = searchQuran(executor, 'الحمد لله');
    const hit = page.results.find((result) => result.kind === 'verse' && result.verse.verseKey === '1:2');
    expect(hit?.kind).toBe('verse');
    if (hit?.kind !== 'verse') {
      return;
    }
    const words = getWords(executor, hit.verse.id);
    expect(hit.highlightedPositions).toEqual(matchedWordPositions(words, ['الحمد', 'لله']));
    expect(hit.highlightedPositions.length).toBeGreaterThanOrEqual(2);
  });

  it('completes a three-letter query in under 150 ms', () => {
    const started = Date.now();
    searchQuran(executor, 'الرح');
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(150);
    process.stdout.write(`\nsearch timing (الرح): ${elapsed.toFixed(1)} ms\n`);
  });
});
