import { act, cleanup, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { useOnline } from '@/core/network/useOnline';
import { openContentDb } from '@/core/db/content/open';
import { installResource } from '@/core/sync';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';
import { resetHadithDownloads, useHadithDownloads } from '@/features/hadith/downloads';
import { setWindowSize, resetWindowSize } from '../../../../jest/window-size';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderGesture as renderGestureBase } from '../../../../jest/seerah-ui';
import { flatStyle, locales } from '../../../../jest/render-ui';
import { eventsFixture, milestonesFixture, paragraphsFixture, placesFixture, regionLevelFixture } from '../fixtures';
import { useSeerahBook, useSeerahCatalogEntry, useSeerahEvent, useSeerahReady, useSeerahWorld } from '../hooks';
import { getSeerahCatalogEntry, type SeerahBook } from '../data';

import { useTimelineCollapseStore } from '../timeline-collapse';
import { SeerahScreen } from './SeerahScreen';

// A landscape iPhone sets side insets per test; every other test has none.
let mockSafeArea = { bottom: 0, left: 0, right: 0, top: 0 };
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => mockSafeArea };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useIsFocused: jest.fn(() => true),
}));
jest.mock('@/core/network/useOnline', () => ({ useOnline: jest.fn(() => true) }));
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});
jest.mock('@/core/sync', () => ({
  installResource: jest.fn(() => new Promise(() => undefined)),
  runDeviceContentSync: jest.fn(() => Promise.resolve()),
}));
// The auto-install reads the catalogue entry from content.db itself; each test points it at `mocked.catalog`.
jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));
jest.mock('../data', () => ({ ...jest.requireActual('../data'), getSeerahCatalogEntry: jest.fn() }));
jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useSeerahBook: jest.fn(),
  useSeerahCatalogEntry: jest.fn(),
  useSeerahEvent: jest.fn(),
  useSeerahReady: jest.fn(),
  useSeerahWorld: jest.fn(),
}));

setUpTests();

/** Renders the screen, then lets the frame pass after which the map mounts its art, pins and routes (see SeerahMap). */
async function renderGesture(...args: Parameters<typeof renderGestureBase>) {
  const view = await renderGestureBase(...args);
  await act(async () => {
    if ('clock' in setTimeout) {
      jest.advanceTimersByTime(50);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
  return view;
}

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
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getSeerahCatalogEntry).mockImplementation(() => mocked.catalog());
    jest.mocked(installResource).mockImplementation(() => new Promise(() => undefined));
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    resetWindowSize();
    jest.restoreAllMocks();
    useTimelineCollapseStore.getState().setCollapsed(false);
    useTimelineCollapseStore.getState().setShortOpen(false);
  });

  describe('without the pack', () => {
    const failNetwork = () =>
      jest.mocked(installResource).mockResolvedValue({ reason: 'network', status: 'failed' } as Awaited<ReturnType<typeof installResource>>);

    it.each(locales)('opens on the downloading card with no tap and no button, and starts the install once (%s)', async (locale) => {
      await renderGesture(<SeerahScreen />, { locale });
      expect(screen.getByTestId('seerah-state-view')).toBeOnTheScreen();
      expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 0 });
      expect(screen.getByText(locale === 'ar' ? /٢٫٤ م\.ب/ : /2\.4 MB/)).toBeOnTheScreen();
      expect(screen.queryByTestId('seerah-state-view-action')).toBeNull();
      expect(installResource).toHaveBeenCalledTimes(1);
      expect(installResource).toHaveBeenCalledWith(9, expect.objectContaining({ signal: expect.anything() }));
    });

    it('starts nothing when the pack is installed', async () => {
      installed();
      await renderGesture(<SeerahScreen />);
      expect(installResource).not.toHaveBeenCalled();
    });

    it('starts nothing while the catalogue does not list the pack', async () => {
      mocked.catalog.mockReturnValue(undefined);
      await renderGesture(<SeerahScreen />);
      expect(installResource).not.toHaveBeenCalled();
    });

    it('restarts a failed install on mount', async () => {
      useHadithDownloads.setState({ byId: { 9: { progress: 0, status: 'failed' } } });
      await renderGesture(<SeerahScreen />);
      expect(installResource).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    });

    it('starts once when the catalogue entry arrives after mount', async () => {
      mocked.catalog.mockReturnValue(undefined);
      await renderGesture(<SeerahScreen />);
      expect(installResource).not.toHaveBeenCalled();
      mocked.catalog.mockReturnValue(CATALOG);
      await act(async () => {
        useHadithDownloads.setState({ byId: {} });
      });
      expect(installResource).toHaveBeenCalledTimes(1);
      await act(async () => {
        useHadithDownloads.setState({ byId: { ...useHadithDownloads.getState().byId } });
      });
      expect(installResource).toHaveBeenCalledTimes(1);
    });

    it('does not restart a failed install when the catalogue entry is re-read with the same id', async () => {
      await renderGesture(<SeerahScreen />);
      expect(installResource).toHaveBeenCalledTimes(1);
      await act(async () => {
        useHadithDownloads.setState({ byId: { 9: { progress: 0, status: 'failed' } } });
      });
      // A pack import bumps the catalogue, so the entry comes back as a new object with the same id.
      mocked.catalog.mockReturnValue({ ...CATALOG });
      await act(async () => {
        bumpCatalogVersion();
        useHadithDownloads.setState({ byId: { ...useHadithDownloads.getState().byId } });
      });
      expect(installResource).toHaveBeenCalledTimes(1);
      expect(screen.getByText('تعذّر فتح السيرة')).toBeOnTheScreen();
    });

    it('shows the progress of a running download with no cancel', async () => {
      await renderGesture(<SeerahScreen />);
      await act(async () => {
        useHadithDownloads.setState({ byId: { 9: { progress: 0.5, status: 'downloading' } } });
      });
      expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 50 });
      expect(screen.queryByRole('button', { name: /إلغاء/ })).toBeNull();
    });

    it.each(locales)('says a connection is needed when offline (%s)', async (locale) => {
      mocked.online.mockReturnValue(false);
      failNetwork();
      await renderGesture(<SeerahScreen />, { locale });
      expect(screen.getByText(locale === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection')).toBeOnTheScreen();
    });

    it('retries from the offline card', async () => {
      mocked.online.mockReturnValue(false);
      failNetwork();
      await renderGesture(<SeerahScreen />);
      expect(installResource).toHaveBeenCalledTimes(1);
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(installResource).toHaveBeenCalledTimes(2);
      expect(installResource).toHaveBeenLastCalledWith(9, expect.anything());
    });

    it.each(locales)('shows a failed download as the error card and downloads again from it (%s)', async (locale) => {
      jest.mocked(installResource).mockResolvedValue({ status: 'failed' } as Awaited<ReturnType<typeof installResource>>);
      await renderGesture(<SeerahScreen />, { locale });
      expect(installResource).toHaveBeenCalledTimes(1);
      expect(screen.getByText(locale === 'ar' ? 'تعذّر فتح السيرة' : 'Seerah could not be opened')).toBeOnTheScreen();
      await press(screen.getByTestId('seerah-state-view-action'));
      expect(installResource).toHaveBeenCalledTimes(2);
    });

    it('offers to download again when the pack on the device has no events', async () => {
      mocked.book.mockReturnValue(BOOK);
      mocked.catalog.mockReturnValue({ ...CATALOG, installed: true });
      await renderGesture(<SeerahScreen />);
      expect(screen.getByText('تعذّر فتح السيرة')).toBeOnTheScreen();
    });

    it('goes back to the Menu tab when there is no history', async () => {
      jest.mocked(router.canGoBack).mockReturnValueOnce(false);
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-state-back'));
      expect(router.replace).toHaveBeenCalledWith('/(main)/(menu)');
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

    it('centres the map on the place from the route, with its pin selected', async () => {
      // Reduce Motion: the view is written at once. The badr pin (803, 1122) at the region's 0.6 zoom, on a 390 x 844 window.
      jest.mocked(useReducedMotion).mockReturnValue(true);
      await renderGesture(<SeerahScreen initialPlace="badr" initialView="map" />);
      // The visible area in the test is y 52 (under the header) to 636 (above the timeline): its centre is 344, at the zoom middle 1.5.
      expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({
        transform: [{ translateX: 195 - 803 * 1.5 }, { translateY: 344 - 1122 * 1.5 }, { scale: 1.5 }],
      });
    });

    it('draws the header and the timeline first, and mounts the art, pins and routes a frame later', async () => {
      jest.useFakeTimers();
      await renderGestureBase(<SeerahScreen initialView="map" />);
      expect(screen.getByTestId('seerah-map-header')).toBeOnTheScreen();
      expect(screen.getByTestId('timeline-bar')).toBeOnTheScreen();
      expect(screen.queryByTestId('seerah-map-art-svg', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByTestId('seerah-map-pin-badr')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(screen.getByTestId('seerah-map-art-svg', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByTestId('seerah-map-pin-badr')).toBeOnTheScreen();
    });

    it('opens the map from the route parameter even when the list is remembered', async () => {
      storage.set(storageKeys.seerah.view, 'list');
      await renderGesture(<SeerahScreen initialView="map" />);
      expect(screen.getByTestId('seerah-map')).toBeOnTheScreen();
      expect(screen.queryByTestId('seerah-list')).toBeNull();
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

    it('titles «أخرى» without placing its events «at this spot»', async () => {
      await renderGesture(<SeerahScreen />);
      await press(screen.getByRole('button', { name: /^أخرى/ }));
      expect(screen.getByTestId('seerah-spot-sheet')).toBeOnTheScreen();
      expect(screen.queryByText(/في هذا الموضع/)).toBeNull();
      expect(screen.getByText(/· بترتيب العمر$/)).toBeOnTheScreen();
    });

    it('pushes an event from the spot sheet on the next frame, after the sheet has closed', async () => {
      jest.useFakeTimers();
      await renderGesture(<SeerahScreen />);
      await press(screen.getByRole('button', { name: /^أخرى/ }));
      expect(screen.getByTestId('seerah-spot-sheet')).toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(screen.getAllByText('[عنوان الفصل في الكتاب]')[0] as never);
      });
      expect(screen.queryByTestId('seerah-spot-sheet')).toBeNull();
      expect(router.push).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersToNextTimer();
      });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/seerah\/event\//));
    });

    it('opens the event as a sheet on a medium window', async () => {
      setWindowSize(700, 900);
      await renderGesture(<SeerahScreen />);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      await press(screen.getByRole('button', { name: /^فتح/ }));
      expect(router.push).not.toHaveBeenCalled();
      expect(screen.getByTestId('seerah-event-view')).toBeOnTheScreen();
    });

    it.each([
      ['compact', 390, 844, 'fill'],
      ['medium', 834, 1210, 'hug'],
      ['expanded', 1210, 834, 'hug'],
    ] as const)('keeps the phone\'s bottom timeline on a %s window, centred and capped at 720 pt', async (_name, width, height, fit) => {
      setWindowSize(width, height);
      await renderGesture(<SeerahScreen />);
      // Developer, 26 Nov 2026: no side timeline on the iPad; the horizontal bar (a 74 pt slider) docks at the bottom.
      expect(flatStyle(screen.getByTestId('timeline-bar-scrubber').props.style)).toMatchObject({ height: 74 });
      expect(flatStyle(screen.getByTestId('seerah-timeline-dock').props.style)).toMatchObject({ maxWidth: 720, width: '100%' });
      // Frame SeerahExpanded: the title pill hugs its text on a wide window instead of stretching.
      expect(flatStyle(screen.getByTestId('seerah-map-header-title-slot').props.style).alignItems).toBe(fit === 'hug' ? 'center' : undefined);
    });

    it.each(locales)('runs the map under the side safe areas of a landscape phone and keeps its controls clear of them (%s)', async (locale) => {
      setWindowSize(874, 402);
      mockSafeArea = { bottom: 21, left: 62, right: 62, top: 0 };
      try {
        await renderGesture(<SeerahScreen />, { locale });
        // No beige strips: the screen does not pad its sides, so the map (and its cover scale) spans the whole window.
        expect(flatStyle(screen.getByTestId('screen-seerah').props.style)).toMatchObject({ paddingEnd: 0, paddingStart: 0 });
        // The header, the timeline and the chip stacks sit inside the 62 pt insets.
        expect(flatStyle(screen.getByTestId('seerah-map-header-row').props.style)).toMatchObject({ end: 16 + 62, start: 16 + 62 });
        expect(flatStyle(screen.getByTestId('seerah-timeline-row').props.style)).toMatchObject({ end: 12 + 62, start: 12 + 62 });
        expect(flatStyle(screen.getByTestId('seerah-map-edges-north').props.style)).toMatchObject({ left: 62 + 16 });
        expect(flatStyle(screen.getByTestId('seerah-map-edges-east').props.style)).toMatchObject({ right: 62 + 16 });
      } finally {
        mockSafeArea = { bottom: 0, left: 0, right: 0, top: 0 };
      }
    });

    it('keeps the phone portrait layout without side insets', async () => {
      await renderGesture(<SeerahScreen />);
      expect(flatStyle(screen.getByTestId('seerah-map-header-row').props.style)).toMatchObject({ end: 16, start: 16 });
      expect(flatStyle(screen.getByTestId('seerah-map-edges-north').props.style)).toMatchObject({ left: 16 });
    });

    describe('hiding the timeline (developer, 26 Nov 2026)', () => {
      it('a hidden timeline leaves its capsule, and the map, the chips and the docked cards take the space back', async () => {
        useTimelineCollapseStore.getState().setCollapsed(true);
        await renderGesture(<SeerahScreen initialAge={3} />);
        expect(screen.queryByTestId('timeline-bar-scrubber')).toBeNull();
        const capsule = screen.getByRole('button', { name: /^إظهار الخط الزمني، عمره ٣ سنة · / });
        expect(capsule).toBeOnTheScreen();
        // No safe area in these tests: the capsule row sits 18 above the bottom, and the clearance is 18 + 44 + 12.
        expect(flatStyle(screen.getByTestId('seerah-timeline-row').props.style)).toMatchObject({ bottom: 18 });
        expect(flatStyle(screen.getByTestId('seerah-map-edges-south').props.style)).toMatchObject({ bottom: 74 });
        // The empty-year card docks above the capsule, not above the hidden card.
        const empty = screen.getByText('لا أحداث في هذا العمر');
        expect(empty).toBeOnTheScreen();
        await press(capsule);
        expect(screen.getByTestId('timeline-bar-scrubber')).toBeOnTheScreen();
        expect(flatStyle(screen.getByTestId('seerah-map-edges-south').props.style)).toMatchObject({ bottom: 208 });
        expect(useTimelineCollapseStore.getState().collapsed).toBe(false);
      });

      it('the timeline card can be hidden from its title, and the choice is saved', async () => {
        jest.mocked(useReducedMotion).mockReturnValue(true);
        await renderGesture(<SeerahScreen />);
        await act(async () => {
          fireEvent(screen.getByRole('header', { name: 'كل الأعمار' }), 'accessibilityAction', { nativeEvent: { actionName: 'collapse' } });
        });
        expect(screen.getByRole('button', { name: /^إظهار الخط الزمني، كل الأعمار · / })).toBeOnTheScreen();
        expect(useTimelineCollapseStore.getState().collapsed).toBe(true);
      });

      it('a landscape phone starts with the timeline hidden, whatever is saved', async () => {
        setWindowSize(874, 402);
        await renderGesture(<SeerahScreen />);
        expect(screen.getByRole('button', { name: /^إظهار الخط الزمني/ })).toBeOnTheScreen();
        expect(screen.queryByTestId('timeline-bar-scrubber')).toBeNull();
      });
    });

    it('opens the event in a side panel beside the bottom timeline on an expanded window', async () => {
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
