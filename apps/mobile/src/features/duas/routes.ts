import type { Href } from 'expo-router';

/** Duas routes (app/duas/*). */
export const duasHref = {
  home: '/duas' as Href,
  quranList: '/duas/quran' as Href,
  quranDetail: (duaKey: string): Href => `/duas/quran/${encodeURIComponent(duaKey)}` as Href,
  hadithList: '/duas/hadith' as Href,
  hadithGroup: (groupId: number): Href => `/duas/hadith?group=${groupId}` as Href,
  hadithDetail: (duaKey: string): Href => `/duas/hadith/${encodeURIComponent(duaKey)}` as Href,
  /** One Duas category page (ADR 0091): ids `quran`, `hadeethenc:<groupId>`, `hisn:<topicId>` or `hadithbook:<slug>:<bookNumber>`. */
  category: (id: string): Href => `/duas/category/${encodeURIComponent(id)}` as Href,
  /** One dua of a category, by its 0-based position in it (`app/duas/category/[id]/[index]`). Its pager stays in the category. */
  categoryItem: (categoryId: string, index: number): Href => `/duas/category/${encodeURIComponent(categoryId)}/${index}` as Href,
  favorites: '/duas/favorites' as Href,
  /** Duas search (screens/, #DuasSearch). */
  search: '/duas/search' as Href,
  mine: '/duas/mine' as Href,
  /** The reading view of one «أدعيتي» entry (`app/duas/mine/[id]`). */
  mineDetail: (id: string): Href => `/duas/mine/${encodeURIComponent(id)}` as Href,
  /** The editor. `reminder: true` opens its reminder row expanded (the list's bell). */
  mineEdit: (id?: string, options?: { reminder?: boolean }): Href => {
    const query = [
      id === undefined ? null : `id=${encodeURIComponent(id)}`,
      options?.reminder === true ? 'reminder=1' : null,
    ].filter((part): part is string => part !== null);
    return (query.length === 0 ? '/duas/mine/edit' : `/duas/mine/edit?${query.join('&')}`) as Href;
  },
  /** The Menu's home tab, where Duas home may be reached from later. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
