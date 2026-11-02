import { randomUUID } from 'expo-crypto';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { deleteReminderForTarget } from '@/features/azkar/reminders/reminders-repository';

export type MyDua = {
  id: string;
  title: string | null;
  body: string;
  textSearch: string;
  createdAt: number;
  updatedAt: number;
};

export type MyDuaInput = {
  title: string | null;
  body: string;
};

export type MyDuasStore = {
  db: SqlExecutor;
  now?: () => number;
  uuid?: () => string;
};

function resolveStore(store?: MyDuasStore): { db: SqlExecutor; now: () => number; uuid: () => string } {
  return {
    db: store?.db ?? openUserDb().executor,
    now: store?.now ?? Date.now,
    uuid: store?.uuid ?? randomUUID,
  };
}

function buildTextSearch(title: string | null, body: string): string {
  const parts = [title, body].filter((part): part is string => part !== null && part.length > 0);
  return normalizeForSearch(parts.join('\n'));
}

const SELECT = `
  SELECT
    id,
    title,
    body,
    text_search AS textSearch,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM my_duas
`;

export function getMyDua(id: string, store?: MyDuasStore): MyDua | null {
  const { db } = resolveStore(store);
  const row = db.get<MyDua>(`${SELECT} WHERE id = ?`, [id]);
  return row ?? null;
}

/** The user's duas, most recently updated first. */
export function listMyDuas(store?: MyDuasStore): MyDua[] {
  const { db } = resolveStore(store);
  return db.all<MyDua>(`${SELECT} ORDER BY updated_at DESC, id ASC`);
}

export function createMyDua(input: MyDuaInput, store?: MyDuasStore): MyDua {
  const { db, now, uuid } = resolveStore(store);
  const id = uuid();
  const timestamp = now();
  const textSearch = buildTextSearch(input.title, input.body);
  db.run(
    `INSERT INTO my_duas (id, title, body, text_search, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.title, input.body, textSearch, timestamp, timestamp],
  );
  const saved = getMyDua(id, { db, now, uuid });
  if (saved === null) {
    throw new Error('The my dua row was not saved.');
  }
  return saved;
}

export function updateMyDua(id: string, input: MyDuaInput, store?: MyDuasStore): MyDua {
  const { db, now, uuid } = resolveStore(store);
  const textSearch = buildTextSearch(input.title, input.body);
  const timestamp = now();
  db.run(`UPDATE my_duas SET title = ?, body = ?, text_search = ?, updated_at = ? WHERE id = ?`, [
    input.title,
    input.body,
    textSearch,
    timestamp,
    id,
  ]);
  const saved = getMyDua(id, { db, now, uuid });
  if (saved === null) {
    throw new Error('The my dua row was not found.');
  }
  return saved;
}

/** Removes the dua and any reminder that pointed at it. */
export function deleteMyDua(id: string, store?: MyDuasStore): void {
  const { db, now, uuid } = resolveStore(store);
  db.transaction(() => {
    deleteReminderForTarget('my_dua', id, { db, now, uuid });
    db.run('DELETE FROM my_duas WHERE id = ?', [id]);
  });
}
