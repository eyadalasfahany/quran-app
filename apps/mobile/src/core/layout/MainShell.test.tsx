import { fireEvent, within } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions, Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { ThemeProvider, themes } from '@/core/theme';
import { openAudioTestDb } from '@/features/audio/data/test-db';
import { usePlayerStore } from '@/features/audio/playerStore';

import { MainShell } from './MainShell';

let db: { executor: SqlExecutor; close: () => void };

// The mini player reads the window class itself, so an expanded shell needs an expanded window too.
function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
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

const searchLabels = {
  ar: 'ابحث في القرآن',
  en: 'Search the Quran',
} as const;

const labels = {
  ar: { nav: 'التنقل الرئيسي', mushaf: 'المصحف' },
  en: { nav: 'Main navigation', mushaf: 'Mushaf' },
} as const;

function shell(expanded: boolean) {
  return (
    <MainShell expanded={expanded}>
      <Text>tabs</Text>
    </MainShell>
  );
}

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

  describe('mini player placement', () => {
    it('floats the mini player above the tabs on a compact window while something is loaded', async () => {
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      const view = await renderUi(shell(false));

      expect(view.getByTestId('mini-player-dock')).toBeOnTheScreen();
      expect(view.getByTestId('mini-player-tabs')).toBeOnTheScreen();
    });

    it('shows nothing while the player is idle', async () => {
      const view = await renderUi(shell(false));

      expect(view.queryByTestId('mini-player-tabs')).toBeNull();
    });

    it('puts the mini player in the sidebar footer on an expanded window while something is loaded', async () => {
      setWindowWidth(1000);
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      const view = await renderUi(shell(true));

      expect(within(view.getByTestId('sidebar-footer')).getByTestId('mini-player-sidebar')).toBeOnTheScreen();
      expect(view.queryByTestId('mini-player-dock')).toBeNull();
    });

    it('shows no sidebar mini player on an expanded window while the player is idle', async () => {
      setWindowWidth(1000);
      const view = await renderUi(shell(true));

      expect(view.queryByTestId('mini-player-sidebar')).toBeNull();
    });

    it('shows no sidebar mini player on a compact window, even while something is loaded', async () => {
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      const view = await renderUi(shell(false));

      expect(view.queryByTestId('mini-player-sidebar')).toBeNull();
      expect(view.queryByTestId('sidebar-footer')).toBeNull();
    });

    it('hides the mini player on an expanded window, where the sidebar takes its place', async () => {
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      const view = await renderUi(shell(true));

      expect(view.queryByTestId('mini-player-dock')).toBeNull();
      expect(view.queryByTestId('mini-player-tabs')).toBeNull();
    });
  });

  it('renders only the tabs on compact and medium windows', async () => {
    const view = await renderUi(shell(false));

    expect(view.getByText('tabs')).toBeOnTheScreen();
    expect(view.queryByTestId('sidebar')).toBeNull();
    expect(flatStyle(view.getByTestId('main-shell').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      flex: 1,
    });
  });

  it('adds the sidebar beside the tabs on expanded windows', async () => {
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar')).toBeOnTheScreen();
    expect(view.getByText('tabs')).toBeOnTheScreen();
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual([
      'sidebar-my-quran',
      'sidebar-home',
      'sidebar-mushaf',
      'sidebar-listen',
      'sidebar-settings',
    ]);
  });

  it('opens search from a field at the top of the expanded sidebar', async () => {
    const view = await renderUi(shell(true));

    await fireEvent.press(view.getByTestId('sidebar-search'));

    expect(router.push).toHaveBeenCalledWith('/search');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows no search field on compact and medium windows', async () => {
    const view = await renderUi(shell(false));

    expect(view.queryByTestId('sidebar-search')).toBeNull();
  });

  it('selects the destination of the current route', async () => {
    jest.mocked(useSegments).mockReturnValue(segments('(main)', '(mushaf)'));
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar-mushaf').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: false });
  });

  it('keeps the tab under a sheet selected while the sheet is open', async () => {
    jest.mocked(useSegments).mockReturnValue(segments('(main)', '(mushaf)'));
    const view = await renderUi(shell(true));

    jest.mocked(useSegments).mockReturnValue(['reader-settings'] as unknown as ReturnType<typeof useSegments>);
    await view.rerender(<ThemeProvider name="light">{shell(true)}</ThemeProvider>);

    expect(view.getByTestId('sidebar-mushaf').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: false });
  });

  it('falls back to home when no destination matches', async () => {
    jest.mocked(useSegments).mockReturnValue([] as unknown as ReturnType<typeof useSegments>);
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: true });
  });

  it('navigates to a destination from the sidebar', async () => {
    const view = await renderUi(shell(true));

    await fireEvent.press(view.getByTestId('sidebar-listen'));

    expect(router.navigate).toHaveBeenCalledWith('/(main)/(listen)');
  });

  it('opens settings from the sidebar with push, not navigate', async () => {
    const view = await renderUi(shell(true));

    await fireEvent.press(view.getByTestId('sidebar-settings'));

    expect(router.push).toHaveBeenCalledWith('/settings');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each(locales)('labels the search field in %s', async (locale) => {
    const view = await renderUi(shell(true), { locale });

    expect(view.getByRole('button', { name: searchLabels[locale] })).toBeOnTheScreen();
  });

  it.each(locales)('labels the sidebar and its tabs in %s', async (locale) => {
    const view = await renderUi(shell(true), { locale });

    expect(view.getByTestId('sidebar').props.accessibilityLabel).toBe(labels[locale].nav);
    expect(view.getByRole('tab', { name: labels[locale].mushaf })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('main-shell').props.style).flexDirection).toBe('row');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/MainShell.tsx')).toEqual([]);
  });
});
