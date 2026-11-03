import type { SqlExecutor } from '@/core/db/sql-executor';

import { countPropheticDuas, countQuranicDuas } from './content-repository';

/** True when a `duas` content pack has at least one row (task 2c). Missing table reads as false. */
export function hasDuasContent(db: SqlExecutor): boolean {
  try {
    return db.get<{ one: number }>('SELECT 1 AS one FROM dua_items LIMIT 1') !== undefined;
  } catch {
    return false;
  }
}

/** True when at least one Quranic dua row exists in the installed pack. */
export function hasQuranicDuas(db: SqlExecutor): boolean {
  try {
    return countQuranicDuas(db) > 0;
  } catch {
    return false;
  }
}

/** True when at least one prophetic (HadeethEnc) dua row exists in the installed pack. */
export function hasPropheticDuas(db: SqlExecutor): boolean {
  try {
    return countPropheticDuas(db) > 0;
  } catch {
    return false;
  }
}
