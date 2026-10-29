import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions, I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes, uiFontFamilies } from '@/core/theme';
import { openAudioTestDb } from '../data/test-db';
import { pause, resume } from '../player';
import { usePlayerStore } from '../playerStore';

import { MiniPlayer } from './MiniPlayer';

const mockContent: { executor: SqlExecutor | null } = { executor: null };

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

jest.mock('../player', () => ({
  pause: jest.fn(),
  resume: jest.fn(() => Promise.resolve()),
  seek: jest.fn(),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => false,
}));

const colors = themes.light.colors;
let db: { executor: SqlExecutor; close: () => void };

beforeEach(() => {
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
  jest.mocked(pause).mockClear();
  jest.mocked(resume).mockClear();
  jest.mocked(router.push).mockClear();
});

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

afterEach(() => {
  db.close();
  mockContent.executor = null;
  I18nManager.isRTL = false;
  setWindowWidth(390);
});

// Surah 1 at 12 s of 48 s: a quarter of the way along.
function loadSurah(status: 'playing' | 'paused' | 'loading' | 'error' = 'paused') {
  const store = usePlayerStore.getState();
  store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 12_000, durationMs: 48_000 });
  if (status === 'playing' || status === 'paused') {
    store.markPlaying();
  }
  if (status === 'paused') {
    store.markPaused();
  }
  if (status === 'error') {
    store.markFailed('load-failed');
  }
}

describe('MiniPlayer', () => {
  it('draws nothing while the player is idle, in the tab variant', async () => {
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-tabs')).toBeNull();
  });

  it('draws nothing while the player is idle, in the reader variant', async () => {
    const view = await renderUi(<MiniPlayer variant="reader" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-reader')).toBeNull();
  });

  it.each(['tabs', 'reader'] as const)('draws nothing on an expanded window, even while playing (%s)', async (variant) => {
    setWindowWidth(1000);
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer variant={variant} />, { theme: 'light' });

    expect(view.queryByTestId(`mini-player-${variant}`)).toBeNull();
  });

  it('shows the tab variant at the frame numbers: 64 high, 20 radius, 10 start and 12 end padding', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });
    const bar = flatStyle(view.getByTestId('mini-player-tabs').props.style);

    expect(bar).toMatchObject({ borderRadius: 20, height: 64, paddingEnd: 12, paddingStart: 10 });
  });

  it('shows the reader variant at the frame numbers: 68 high, 20 radius, 12 start and 10 end padding', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="reader" />, { theme: 'light' });
    const bar = flatStyle(view.getByTestId('mini-player-reader').props.style);

    expect(bar).toMatchObject({ borderRadius: 20, height: 68, paddingEnd: 10, paddingStart: 12 });
  });

  it('sizes the tab tile and sets the tab text sizes', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    expect(flatStyle(view.getByTestId('mini-player-tile', { includeHiddenElements: true }).props.style)).toMatchObject({
      borderRadius: 14,
      height: 44,
      width: 44,
    });
    expect(flatStyle(view.getByText('مشاري راشد العفاسي').props.style)).toMatchObject({
      fontFamily: uiFontFamilies[600],
      fontSize: 17,
    });
    expect(flatStyle(view.getByText('الفاتحة').props.style).fontSize).toBe(13);
  });

  it('sizes the reader tile and sets the reader text sizes', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="reader" />, { theme: 'light' });

    expect(flatStyle(view.getByTestId('mini-player-tile', { includeHiddenElements: true }).props.style)).toMatchObject({
      borderRadius: 12,
      height: 46,
      width: 46,
    });
    expect(flatStyle(view.getByText('مشاري راشد العفاسي').props.style).fontSize).toBe(15);
    expect(flatStyle(view.getByText('الفاتحة').props.style).fontSize).toBe(12);
  });

  it("shows the reciter's name and the surah's bare name, without the «سورة» prefix", async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
    expect(view.queryByText('سورة الفاتحة')).toBeNull();
  });

  it('shows the English names in English', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { locale: 'en', theme: 'light' });

    expect(view.getByText('Mishari Rashid')).toBeOnTheScreen();
    expect(view.getByText('The Opener')).toBeOnTheScreen();
  });

  it('opens the full player when the bar is tapped', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة' }));
    expect(router.push).toHaveBeenCalledWith('/player');
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('pauses when the button is pressed while playing', async () => {
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('resumes when the button is pressed while paused', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));
    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });

  it('shows the pause label while loading and pauses from there', async () => {
    loadSurah('loading');
    const view = await renderUi(<MiniPlayer variant="reader" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('shows the play button after an error, so the player can be retried', async () => {
    loadSurah('error');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    expect(view.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('fills the progress line to a quarter at 12 s of 48 s', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });
    const fill = flatStyle(view.getByTestId('mini-player-progress-fill', { includeHiddenElements: true }).props.style);

    expect(fill.width).toBe('25%');
    expect(fill.backgroundColor).toBe(colors.gold);
  });

  it.each(locales)('lays the progress line out from the start edge in %s', async (locale) => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { locale, theme: 'light' });
    const track = flatStyle(view.getByTestId('mini-player-progress', { includeHiddenElements: true }).props.style);

    expect(track).toMatchObject({ flexDirection: 'row', start: 0, end: 0 });
  });

  it('describes the bar as a button with the reciter and surah, and a hint that it opens the player', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });
    const bar = view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة' });

    expect(bar.props.accessibilityHint).toBe('يفتح المشغّل');
  });

  it('labels the toggle with its own state, separate from the bar, so the two are two buttons', async () => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { theme: 'light' });

    expect(view.getByRole('button', { name: 'تشغيل' }).props.accessibilityState).toEqual({ disabled: false });
    expect(view.getAllByRole('button')).toHaveLength(2);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayer.tsx')).toEqual([]);
  });
});
