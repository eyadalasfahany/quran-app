import { desc } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { myDuas } from '@/core/db/user/schema';

export function liveMyDuasQuery(db: UserDatabase) {
  return db
    .select({
      id: myDuas.id,
      title: myDuas.title,
      body: myDuas.body,
      textSearch: myDuas.textSearch,
      createdAt: myDuas.createdAt,
      updatedAt: myDuas.updatedAt,
    })
    .from(myDuas)
    .orderBy(desc(myDuas.updatedAt), myDuas.id);
}
