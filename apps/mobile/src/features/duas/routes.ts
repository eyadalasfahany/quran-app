import type { Href } from 'expo-router';

/** Duas routes (app/duas/*). */
export const duasHref = {
  home: '/duas' as Href,
  favorites: '/duas/favorites' as Href,
  mine: '/duas/mine' as Href,
  mineEdit: (id?: string): Href =>
    (id === undefined ? '/duas/mine/edit' : `/duas/mine/edit?id=${encodeURIComponent(id)}`) as Href,
  /** The Menu's home tab, where Duas home may be reached from later. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
