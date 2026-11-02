import { act } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions, Platform, Text } from 'react-native';
import { setUpTests } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { resetNetworkStateForTests, useNetworkStatus } from '@/core/network/network-state';
import { themes } from '@/core/theme';
import { openAudioTestDb } from '@/features/audio/data/test-db';
import { usePlayerStore } from '@/features/audio/playerStore';

import { MainShell } from './MainShell';
import { miniPlayerBottom, miniPlayerHiddenTabsBottom } from './tab-bar-clearance';
import { useTabBarScrollStore } from './tab-bar-scroll-store';
import { useTabRailSideInset } from './TabRailContext';

setUpTests();

let db: { executor: SqlExecutor; close: () => void };

// The mini player reads the window class itself, so every window size is set on the window, not on the shell.
function setWindowWidth(width: number, height = 844) {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
  useSegments: jest.fn(() => ['(main)', '(home)']),
}));

const mockContent: { executor: SqlExecutor | null } = { executor: null };

// The mini player reads the reciter and surah names from the content database.
jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => false,
}));

// useSegments is typed as a generic tuple; the tests only need the route names.
function segments(...names: string[]) {
  return names as unknown as ReturnType<typeof useSegments>;
}

function shell() {
  return (
    <MainShell>
      <Text>tabs</Text>
    </MainShell>
  );
}

// Reads the start-side clearance a tab screen gets from the shell (TabRailContext).
function RailInsetProbe() {
  return <Text testID="rail-inset">{String(useTabRailSideInset())}</Text>;
}

const playing = { reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 };

describe('MainShell', () => {
  beforeEach(() => {
    jest.mocked(router.navigate).mockClear();
    jest.mocked(router.push).mockClear();
    jest.mocked(useSegments).mockReturnValue(segments('(main)', '(home)'));
    db = openAudioTestDb();
    mockContent.executor = db.executor;
    db.executor.run(`INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order,
       verses_count, bismillah_pre, page_start, page_end) VALUES (1, 'الفاتحة', 'Al-Fatiha', 'The Opener', 'makkah', 5, 7, 0, 1, 1)`);
    db.executor.run(`INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
       (30, 'chapter_recitations', 'Mishari Rashid', 'مشاري راشد العفاسي', 1, 1000, 1)`);
    db.executor.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
       (30, 'chapter_recitations', 1, 'a', 0, 'Mishari Rashid', 'مشاري راشد العفاسي')`);
    db.executor.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES
       (1, 30, 'Mishari Rashid', 'مشاري راشد العفاسي', 'Murattal', 1)`);
    db.executor.run(`INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
       (100, 1, 1, 'https://example.test/1.mp3', 48000, 'mp3')`);
    usePlayerStore.getState().reset();
  });

  afterEach(() => {
    db.close();
    mockContent.executor = null;
    setWindowWidth(390);
  });

  describe('mini player drop while scrolling hides the tabs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
      await act(async () => {
        useTabBarScrollStore.setState({ collapsed: false, lastY: 0, tracking: false });
      });
    });

    /** Runs the mini player's spring to its end. */
    async function settle() {
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
    }

    it('drops the mini player into the tab bar slot by the difference of the two bottoms, and returns it when the bar comes back', async () => {
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());
      const drop = miniPlayerBottom(Platform.OS, 0, false) - miniPlayerHiddenTabsBottom(Platform.OS, 0, false);

      await act(async () => {
        useTabBarScrollStore.setState({ collapsed: true, tracking: true });
      });
      await settle();
      expect(view.getByTestId('mini-player-dock')).toHaveAnimatedStyle({ transform: [{ translateY: drop }] });

      await act(async () => {
        useTabBarScrollStore.setState({ collapsed: false, lastY: 0, tracking: false });
      });
      await settle();
      expect(view.getByTestId('mini-player-dock')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    });
  });

  describe('mini player placement', () => {
    it('floats the mini player above the tabs on a compact window while something is loaded', async () => {
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());

      expect(view.getByTestId('mini-player-dock')).toBeOnTheScreen();
      expect(view.getByTestId('mini-player-tabs')).toBeOnTheScreen();
    });

    it('shows nothing while the player is idle', async () => {
      const view = await renderUi(shell());

      expect(view.queryByTestId('mini-player-tabs')).toBeNull();
    });

    it('clears the rail on the start edge, not the bottom, on an expanded window (ADR 0051, amended 2 Nov 2026)', async () => {
      setWindowWidth(1000);
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());

      expect(view.getByTestId('mini-player-tabs')).toBeOnTheScreen();
      // The bottom is the bottom safe area plus the 12 gap (no bottom bar); the start is the rail's 100 plus the 16 side.
      expect(flatStyle(view.getByTestId('mini-player-dock').props.style)).toMatchObject({
        bottom: miniPlayerBottom(Platform.OS, 0, true),
        start: 100 + 16,
      });
    });

    it('keeps the phone placement above the bottom bar, with no start clearance, on a phone (ADR 0051)', async () => {
      setWindowWidth(390);
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());

      expect(flatStyle(view.getByTestId('mini-player-dock').props.style)).toMatchObject({
        bottom: miniPlayerBottom(Platform.OS, 0, false),
        start: 16,
      });
    });

    it.each(locales)('clears the rail on the start edge of an expanded window in %s (ADR 0051, amended)', async (locale) => {
      setWindowWidth(1024, 768);
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell(), { locale });

      // The start side is a logical edge: the rail's clearance is the same value in LTR and RTL, and RN mirrors it.
      expect(flatStyle(view.getByTestId('mini-player-dock').props.style)).toMatchObject({ start: 116 });
      expect(flatStyle(view.getByTestId('mini-player-dock').props.style).end).toBe(16);
    });

    it('shows nothing on an expanded window while the player is idle', async () => {
      setWindowWidth(1000);
      const view = await renderUi(shell());

      expect(view.queryByTestId('mini-player-tabs')).toBeNull();
    });
  });

  it.each([390, 700, 1000])('renders the content and no sidebar on a window %i wide (ADR 0051)', async (width) => {
    setWindowWidth(width);
    const view = await renderUi(shell());

    expect(view.getByText('tabs')).toBeOnTheScreen();
    expect(view.queryByTestId('sidebar')).toBeNull();
    expect(view.queryByTestId('sidebar-footer')).toBeNull();
    expect(flatStyle(view.getByTestId('main-shell').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      flex: 1,
    });
  });

  it.each([
    ['a 390 by 844 phone', 390, 844, 0],
    ['a 1024 by 768 tablet', 1024, 768, 100],
    ['a 1024 by 1366 iPad in portrait', 1024, 1366, 100],
    ['a 1280 by 800 tablet', 1280, 800, 100],
  ])('gives the tab screens the rail clearance on the start edge for %s', async (_name, width, height, inset) => {
    setWindowWidth(width, height);
    const view = await renderUi(
      <MainShell>
        <RailInsetProbe />
      </MainShell>,
    );

    expect(view.getByTestId('rail-inset').props.children).toBe(String(inset));
  });

  it('keeps the offline notice clear of the rail on a tablet, on the start edge (ADR 0051, amended)', async () => {
    setWindowWidth(1024, 768);
    resetNetworkStateForTests();
    useNetworkStatus.setState({ online: false });
    try {
      const view = await renderUi(shell());

      expect(flatStyle(view.getByTestId('offline-strip-dock').props.style)).toMatchObject({ start: 100, top: 0 });
    } finally {
      resetNetworkStateForTests();
    }
  });

  it('shows the offline notice while the device is offline', async () => {
    resetNetworkStateForTests();
    useNetworkStatus.setState({ online: false });
    try {
      const view = await renderUi(shell());

      expect(
        view.getByLabelText('أنت غير متصل. المصحف والتلاوات المحمّلة تعمل كالمعتاد.'),
      ).toBeOnTheScreen();
    } finally {
      resetNetworkStateForTests();
    }
  });

  it.each(locales)('shows the mini player on an expanded window in %s', async (locale) => {
    setWindowWidth(1000);
    usePlayerStore.getState().beginLoad(playing);
    const view = await renderUi(shell(), { locale });

    expect(view.getByTestId('mini-player-tabs')).toBeOnTheScreen();
  });

  describe('on Android (ADR 0033)', () => {
    const originalOs = Platform.OS;

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOs });
    });

    it('floats the mini player above the floating bar: 12 + 64 from the edge, then the 12 pt gap', async () => {
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());

      expect(flatStyle(view.getByTestId('mini-player-dock').props.style).bottom).toBe(88);
    });

    it('clears the rail, not the floating bar, on an expanded window on Android (ADR 0051, amended)', async () => {
      setWindowWidth(1000);
      usePlayerStore.getState().beginLoad(playing);
      const view = await renderUi(shell());

      // No bottom bar on a tablet: 0 safe-area inset + the 12 gap, and the rail's 116 from the start edge.
      expect(flatStyle(view.getByTestId('mini-player-dock').props.style)).toMatchObject({ bottom: 12, start: 116 });
    });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/MainShell.tsx')).toEqual([]);
  });
});
