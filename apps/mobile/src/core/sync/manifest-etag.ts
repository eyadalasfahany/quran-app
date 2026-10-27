import type { SqlExecutor } from '@/core/db/sql-executor';

export const MANIFEST_ETAG_KEY = 'manifest_etag';

export function clearManifestEtag(db: SqlExecutor): void {
  db.run('DELETE FROM meta WHERE key = ?', [MANIFEST_ETAG_KEY]);
}
