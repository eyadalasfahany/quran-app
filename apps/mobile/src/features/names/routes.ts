import type { Href } from 'expo-router';

export const namesHref = {
  home: '/asmaa' as Href,
  detail: (slug: string): Href => `/asmaa/${encodeURIComponent(slug)}` as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
