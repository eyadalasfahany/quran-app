import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openUserDb } from '@/core/db/user/open';

import { liveMyDuasQuery } from './live-queries';
import type { MyDua } from './my-duas-repository';

export function useMyDuas(): MyDua[] {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveMyDuasQuery(db));
  return useMemo(() => data as MyDua[], [data]);
}
