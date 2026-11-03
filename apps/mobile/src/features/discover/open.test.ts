import { router } from 'expo-router';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useReaderSettings } from '@/features/reader/settings';

import { DISCOVER_HREF, openDiscoverEntry, startTourAt, unwindTourScreens } from './open';
import { DISCOVER_ENTRIES, type DiscoverEntry } from './registry';
import { readDiscoverState } from './store';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('expo-router')>('expo-router'),
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canDismiss: jest.fn(() => true), dismissAll: jest.fn() },
}));

const entryFor = (id: DiscoverEntry['id']): DiscoverEntry => DISCOVER_ENTRIES.find((entry) => entry.id === id)!;

beforeEach(() => {
  storage.clearAll();
  jest.clearAllMocks();
  jest.mocked(router.canDismiss).mockReturnValue(true);
});

describe('unwindTourScreens', () => {
  it('dismisses the screens opened for earlier steps when there are some', () => {
    unwindTourScreens();
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is nothing to dismiss', () => {
    jest.mocked(router.canDismiss).mockReturnValue(false);
    unwindTourScreens();
    expect(router.dismissAll).not.toHaveBeenCalled();
  });
});

describe('openDiscoverEntry', () => {
  it.each([
    ['reader.mushaf', 'mushaf'],
    ['reader.reading', 'reading'],
    ['reader.focus', 'focus'],
  ] as const)('opens the Quran screen in the step’s mode (%s)', (id, mode) => {
    openDiscoverEntry(entryFor(id));

    expect(useReaderSettings.getState().mode).toBe(mode);
    expect(router.push).toHaveBeenCalledWith('/read/1:1');
  });

  it('opens the Quran screen for tafsir without changing the mode', () => {
    useReaderSettings.getState().setMode('reading');
    openDiscoverEntry(entryFor('reader.tafsir'));

    expect(useReaderSettings.getState().mode).toBe('reading');
    expect(router.push).toHaveBeenCalledWith('/read/1:1');
  });

  it('opens the reader at the saved place, not the surah list', () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    openDiscoverEntry(entryFor('reader.focus'));
    expect(router.push).toHaveBeenCalledWith('/read/2:255');
  });

  it('pushes a route', () => {
    openDiscoverEntry(entryFor('worship.sibha'));
    expect(router.push).toHaveBeenCalledWith('/sibha');
  });

  it('navigates to a tab through its destination', () => {
    openDiscoverEntry(entryFor('listen.follow'));
    expect(router.navigate).toHaveBeenCalledWith('/(main)/(listen)');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens the Discover screen for the widget step, where the sheet shows', () => {
    openDiscoverEntry(entryFor('app.widget'));
    expect(router.navigate).toHaveBeenCalledWith(DISCOVER_HREF);
  });
});

describe('startTourAt', () => {
  it('starts the tour at the row when the tour is not on it, without opening its screen', () => {
    startTourAt(entryFor('worship.sibha'));

    expect(readDiscoverState().tourStep).toBe('worship.sibha');
    expect(router.push).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
  });

  it('opens the row’s screen again when the tour is already on it, and keeps the step', () => {
    startTourAt(entryFor('worship.sibha'));
    jest.clearAllMocks();
    jest.mocked(router.canDismiss).mockReturnValue(true);

    startTourAt(entryFor('worship.sibha'));

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/sibha');
    expect(readDiscoverState().tourStep).toBe('worship.sibha');
  });
});
