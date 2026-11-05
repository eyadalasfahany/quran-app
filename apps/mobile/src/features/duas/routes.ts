import type { Href } from 'expo-router';

/** Duas routes (app/duas/*). */
export const duasHref = {
  home: '/duas' as Href,
  quranList: '/duas/quran' as Href,
  quranDetail: (duaKey: string): Href => `/duas/quran/${encodeURIComponent(duaKey)}` as Href,
  hadithList: '/duas/hadith' as Href,
  hadithGroup: (groupId: number): Href => `/duas/hadith?group=${groupId}` as Href,
  hadithDetail: (duaKey: string): Href => `/duas/hadith/${encodeURIComponent(duaKey)}` as Href,
  favorites: '/duas/favorites' as Href,
  mine: '/duas/mine' as Href,
  mineEdit: (id?: string): Href =>
    (id === undefined ? '/duas/mine/edit' : `/duas/mine/edit?id=${encodeURIComponent(id)}`) as Href,
  /** The Menu's home tab, where Duas home may be reached from later. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
