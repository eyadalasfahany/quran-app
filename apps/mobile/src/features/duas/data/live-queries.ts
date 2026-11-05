import { asc, desc, eq } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { duaFavorites, myDuas } from '@/core/db/user/schema';

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

/** Dua favourites, newest first. */
export function liveDuaFavoritesQuery(db: UserDatabase) {
  return db
    .select({ duaKey: duaFavorites.duaKey, createdAt: duaFavorites.createdAt })
    .from(duaFavorites)
    .orderBy(desc(duaFavorites.createdAt), asc(duaFavorites.duaKey));
}

export function liveIsDuaFavoriteQuery(db: UserDatabase, duaKey: string) {
  return db
    .select({ duaKey: duaFavorites.duaKey })
    .from(duaFavorites)
    .where(eq(duaFavorites.duaKey, duaKey))
    .limit(1);
}
