import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

// The user database is not open under Jest; Home's recent listens are empty.
jest.mock('@/features/audio/data/recent-listens-hooks', () => ({
  useRecentListens: () => ({ data: [] }),
}));

// The user database is not open under Jest; the Listen tab (the route's parent) reads no downloads.
jest.mock('@/features/audio/data/downloads', () => ({
  ...jest.requireActual<typeof import('@/features/audio/data/downloads')>('@/features/audio/data/downloads'),
  useDoneCountsByReciter: () => ({}),
  useReciterDownloads: () => ({ data: [] }),
}));

// The route only reads the id and renders the page; the page has its own tests.
jest.mock('@/features/audio/screens/ReciterDownloadsScreen', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReciterDownloadsScreen: ({ resourceId }: { resourceId: number }) =>
      createElement(View, { accessibilityLabel: String(resourceId), testID: 'reciter-route-screen' } as ComponentProps<
        typeof View
      >),
  };
});

describe('reciter route', () => {
  // The app starts in Arabic; these tests use the English labels, so they save English first (as a reader would).
  beforeEach(async () => {
    storage.set(storageKeys.locale, 'en');
    I18nManager.isRTL = false;
    await i18n.changeLanguage('en');
  });

  it('renders the reciter page for the id in the path, inside the Listen tab', async () => {
    const view = await renderRouter('./app');

    await act(async () => {
      router.navigate('/(main)/(listen)');
    });
    await act(async () => {
      router.push('/(main)/(listen)/reciter/31');
    });

    expect(screen.getByTestId('reciter-route-screen').props.accessibilityLabel).toBe('31');
    expect(view.getSegments()).toEqual(['(main)', '(listen)', 'reciter', '[id]']);
  });

  it('returns to the Listen list on back', async () => {
    const view = await renderRouter('./app');

    await act(async () => {
      router.navigate('/(main)/(listen)');
    });
    await act(async () => {
      router.push('/(main)/(listen)/reciter/31');
    });
    await act(async () => {
      router.back();
    });

    expect(view.getSegments()).toEqual(['(main)', '(listen)']);
  });

  it('passes 0 for an id that is not a number, so the page reports the reciter as not found', async () => {
    await renderRouter('./app', { initialUrl: '/(main)/(listen)/reciter/abc' });

    expect(screen.getByTestId('reciter-route-screen').props.accessibilityLabel).toBe('0');
  });
});
