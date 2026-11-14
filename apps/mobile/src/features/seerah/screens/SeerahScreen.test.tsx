import { act, cleanup, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { useOnline } from '@/core/network/useOnline';
import { installResource } from '@/core/sync';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { resetHadithDownloads, useHadithDownloads } from '@/features/hadith/downloads';
import { setWindowSize, resetWindowSize } from '../../../../jest/window-size';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderGesture } from '../../../../jest/seerah-ui';
import { locales } from '../../../../jest/render-ui';
import { eventsFixture, milestonesFixture, paragraphsFixture, placesFixture, regionLevelFixture } from '../fixtures';
import { useSeerahBook, useSeerahCatalogEntry, useSeerahEvent, useSeerahReady, useSeerahWorld } from '../hooks';
import type { SeerahBook } from '../data';

import { SeerahScreen } from './SeerahScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/core/network/useOnline', () => ({ useOnline: jest.fn(() => true) }));
jest.mock('@/core/sync', () => ({
  installResource: jest.fn(() => new Promise(() => undefined)),
  runDeviceContentSync: jest.fn(() => Promise.resolve()),
}));
jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useSeerahBook: jest.fn(),
  useSeerahCatalogEntry: jest.fn(),
  useSeerahEvent: jest.fn(),
  useSeerahReady: jest.fn(),
  useSeerahWorld: jest.fn(),
}));

const BOOK: SeerahBook = {
  attributionAr: 'x',
  attributionEn: 'x',
  authorAr: 'x',
  editionAr: 'x',
  eventsCount: 10,
  paragraphsCount: 2,
  placesCount: 7,
  resourceId: 9,
  routesCount: 0,
  sectionsCount: 2,
  slug: 'b',
  titleAr: 'x',
};
const CATALOG = { installed: false, packSizeBytes: 2516582, resourceId: 9, version: 1 };
const WORLD = {
  events: eventsFixture,
  levels: [regionLevelFixture],
  milestones: milestonesFixture,
  places: placesFixture,
  routes: [],
};
const EMPTY = { events: [], levels: [], milestones: [], places: [], routes: [] };

const mocked = {
  book: useSeerahBook as jest.Mock,
  catalog: useSeerahCatalogEntry as jest.Mock,
  event: useSeerahEvent as jest.Mock,
  online: useOnline as jest.Mock,
  ready: useSeerahReady as jest.Mock,
  world: useSeerahWorld as jest.Mock,
};

function installed() {
  mocked.book.mockReturnValue(BOOK);
  mocked.catalog.mockReturnValue({ ...CATALOG, installed: true });
  mocked.world.mockReturnValue(WORLD);
  mocked.event.mockImplementation((id: string) => {
    const index = eventsFixture.findIndex((event) => event.id === id);
    const event = eventsFixture[index];
    return event === undefined
      ? undefined
      : {
          event,
          index: index + 1,
          next: eventsFixture[index + 1] ?? null,
          previous: eventsFixture[index - 1] ?? null,
          text: { paragraphs: paragraphsFixture, sourcePage: 123 },
          total: eventsFixture.length,
        };
  });
}

describe('SeerahScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.remove(storageKeys.seerah.view);
    resetHadithDownloads();
    mocked.ready.mockReturnValue(true);
    mocked.online.mockReturnValue(true);
    mocked.book.mockReturnValue(undefined);
    mocked.catalog.mockReturnValue(CATALOG);
    mocked.world.mockReturnValue(EMPTY);
    mocked.event.mockReturnValue(undefined);
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    cleanup();
    resetWindowSize();
    jest.restoreAllMocks();
  });

  describe('without the pack', () => {
    it.each(locales)('offers the download with its size (%s)', async (locale) => {
      await renderGesture(<SeerahScreen />, { locale });
      expect(screen.getByTestId('seerah-state-view')).toBeOnTheScreen();
      expect(screen.getByText(locale === 'ar' ? /٢٫٤ م\.ب/ : /2\.4 MB/)).toBeOnTheScreen();
    });

    it('installs the Seerah pack through the shared install path', async () => {
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(installResource).toHaveBeenCalledWith(9, expect.objectContaining({ signal: expect.anything() }));
    });

    it('shows the progress of a running download and cancels it', async () => {
      await renderGesture(<SeerahScreen />);
      await act(async () => {
        useHadithDownloads.setState({ byId: { 9: { progress: 0.5, status: 'downloading' } } });
      });
      expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    });

    it('says a connection is needed when offline', async () => {
      mocked.online.mockReturnValue(false);
      await renderGesture(<SeerahScreen />);
      expect(screen.getByText('لا يوجد اتصال بالإنترنت')).toBeOnTheScreen();
    });

    it('retries from the offline card', async () => {
      mocked.online.mockReturnValue(false);
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(installResource).toHaveBeenCalledWith(9, expect.anything());
    });

    it('shows a failed download as the error card and downloads again from it', async () => {
      await renderGesture(<SeerahScreen />);
      await act(async () => {
        useHadithDownloads.setState({ byId: { 9: { progress: 0, status: 'failed' } } });
      });
      expect(screen.getByText('تعذّر فتح السيرة')).toBeOnTheScreen();
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(installResource).toHaveBeenCalledTimes(1);
    });

    it('offers to download again when the pack on the device has no events', async () => {
      mocked.book.mockReturnValue(BOOK);
      await renderGesture(<SeerahScreen />);
      expect(screen.getByText('تعذّر فتح السيرة')).toBeOnTheScreen();
    });

    it('renders nothing before content.db is ready', async () => {
      mocked.ready.mockReturnValue(false);
      await renderGesture(<SeerahScreen />);
      expect(screen.queryByTestId('seerah-state-view')).toBeNull();
    });
  });

  describe('with the pack', () => {
    beforeEach(installed);

    it.each(locales)('draws the map with its header and timeline (%s)', async (locale) => {
      await renderGesture(<SeerahScreen />, { locale });
      expect(screen.getByTestId('seerah-map')).toBeOnTheScreen();
      expect(screen.getByTestId('seerah-map-header')).toBeOnTheScreen();
      expect(screen.getByTestId('timeline-bar')).toBeOnTheScreen();
    });

    it('swaps to the list, remembers the choice and swaps back', async () => {
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-header-toggle'));
      expect(screen.getByTestId('seerah-list')).toBeOnTheScreen();
      expect(storage.getString(storageKeys.seerah.view)).toBe('list');
      await press(screen.getByTestId('seerah-list-toggle'));
      expect(screen.getByTestId('seerah-map')).toBeOnTheScreen();
      expect(storage.getString(storageKeys.seerah.view)).toBe('map');
    });

    it('opens the list from the route parameter and pushes an event from it', async () => {
      await renderGesture(<SeerahScreen initialView="list" />);
      await press(screen.getAllByText('[عنوان الفصل في الكتاب]')[0] as never);
      expect(router.push).toHaveBeenCalledWith('/seerah/event/e001');
    });

    it('opens the remembered list', async () => {
      storage.set(storageKeys.seerah.view, 'list');
      await renderGesture(<SeerahScreen />);
      expect(screen.getByTestId('seerah-list')).toBeOnTheScreen();
    });

    it('suggests the list when a screen reader is on and nothing was chosen', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await renderGesture(<SeerahScreen />);
      await act(async () => undefined);
      expect(screen.getByTestId('seerah-list')).toBeOnTheScreen();
      expect(storage.getString(storageKeys.seerah.view)).toBeUndefined();
    });

    it('does not override a remembered map with the screen reader suggestion', async () => {
      storage.set(storageKeys.seerah.view, 'map');
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await renderGesture(<SeerahScreen />);
      await act(async () => undefined);
      expect(screen.getByTestId('seerah-map')).toBeOnTheScreen();
    });

    it('opens the map key sheet', async () => {
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-header-key'));
      expect(screen.getByTestId('seerah-map-key')).toBeOnTheScreen();
    });

    it('says when an age has no events and jumps to the nearest', async () => {
      await renderGesture(<SeerahScreen initialAge={3} />);
      expect(screen.getByText('لا أحداث في هذا العمر')).toBeOnTheScreen();
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(screen.queryByText('لا أحداث في هذا العمر')).toBeNull();
    });

    it('shows a callout for a single event and pushes the event page on a compact window', async () => {
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      expect(screen.getByTestId('seerah-event-callout')).toBeOnTheScreen();
      await press(screen.getByRole('button', { name: /^فتح/ }));
      expect(router.push).toHaveBeenCalledWith('/seerah/event/e006');
    });

    it('opens the event as a sheet on a medium window', async () => {
      setWindowSize(700, 900);
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      await press(screen.getByRole('button', { name: /^فتح/ }));
      expect(router.push).not.toHaveBeenCalled();
      expect(screen.getByTestId('seerah-event-view')).toBeOnTheScreen();
    });

    it('opens the event in a side panel with the vertical timeline on an expanded window', async () => {
      setWindowSize(1180, 820);
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      await press(screen.getByRole('button', { name: /^فتح/ }));
      expect(screen.getByTestId('seerah-event-panel')).toBeOnTheScreen();
      expect(screen.getByTestId('seerah-event-view')).toBeOnTheScreen();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('keeps the selected place and age across a resize', async () => {
      await renderGesture(<SeerahScreen initialAge={54} />);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      await act(async () => {
        setWindowSize(1180, 820);
      });
      expect(screen.getByTestId('seerah-map')).toBeOnTheScreen();
      expect(screen.getByTestId('seerah-event-callout')).toBeOnTheScreen();
    });
  });
});
