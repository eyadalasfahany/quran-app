import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';

/*
| ADR 0093, migration 0019: the word range columns are added to azkar_segments on a content.db that is at 0018. An existing
| row keeps NULL in both, so a segment stored before the migration stays a whole-verse segment.
*/

const MIGRATION = '0019_azkar_segment_word_range.sql';

describe('migration 0019 on a content.db at 0018', () => {
  it('adds word_from and word_to, and leaves an existing segment row as NULL', () => {
    const { database, executor } = openAzkarContentDb();
    try {
      // Rebuild the 0018 shape: the table without the two columns, and one row stored before the migration.
      database.exec('ALTER TABLE azkar_segments DROP COLUMN word_from');
      database.exec('ALTER TABLE azkar_segments DROP COLUMN word_to');
      database.exec("INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar) VALUES (1, 1, 1, 'text', 'FIXTURE text')");

      const sql = readFileSync(join(process.cwd(), 'src/core/db/content/migrations', MIGRATION), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        const trimmed = statement.trim();
        if (trimmed !== '') {
          database.exec(trimmed);
        }
      }

      const columns = executor.all<{ name: string }>('PRAGMA table_info(azkar_segments)').map((column) => column.name);
      expect(columns).toEqual(expect.arrayContaining(['word_from', 'word_to']));

      expect(executor.get<{ wordFrom: number | null; wordTo: number | null }>(
        'SELECT word_from AS wordFrom, word_to AS wordTo FROM azkar_segments WHERE resource_id = 1 AND item_id = 1 AND position = 1',
      )).toEqual({ wordFrom: null, wordTo: null });
    } finally {
      database.close();
    }
  });
});
