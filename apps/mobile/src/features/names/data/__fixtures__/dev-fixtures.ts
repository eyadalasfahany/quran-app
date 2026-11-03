import type { SqlExecutor } from '@/core/db/sql-executor';

import { FIXTURE_NAME_AR } from '../../constants';

const RESOURCE_ID = 9001;

/** Loads one placeholder name row for local/tests — not production content. */
export function loadNamesDevFixtures(db: SqlExecutor): void {
  db.run(
    `INSERT OR REPLACE INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (?, 'names', 1, 'fixture', 0, NULL)`,
    [RESOURCE_ID],
  );
  db.run(
    `INSERT INTO names_lists (resource_id, list_slug, title_ar, source_label_ar, attribution_ar, attribution_en, edition_reference, source_version)
     VALUES (?, 'fixture-list', 'FIXTURE list title', 'FIXTURE source label', NULL, NULL, NULL, '0.0.0-scaffold')`,
    [RESOURCE_ID],
  );
  db.run(
    `INSERT INTO names (resource_id, id, name_slug, position, name_ar, text_search)
     VALUES (?, 1, 'fixture-name-1', 1, ?, 'fixture name 1')`,
    [RESOURCE_ID, FIXTURE_NAME_AR],
  );
}
