import { fireEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions, I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes, uiFontFamilies } from '@/core/theme';
import { openAudioTestDb } from '../data/test-db';
import { useReaderMiniCollapse } from '@/features/reader/mini-bar-collapse';

import { playVerse } from '../play-verse';
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

jest.mock('../play-verse', () => ({
  ...jest.requireActual<typeof import('../play-verse')>('../play-verse'),
  playVerse: jest.fn(() => Promise.resolve()),
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
  useReaderMiniCollapse.getState().setCollapsed(false);
  jest.mocked(playVerse).mockClear();
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

  it('draws the reader bar while idle when a reciter resolves, with the play glyph and no progress line', async () => {
    const view = await renderUi(<MiniPlayer topVerseKey="1:1" variant="reader" />, { theme: 'light' });

    expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
    expect(view.queryByTestId('mini-player-progress')).toBeNull();
    expect(view.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('draws nothing while idle in the reader variant when no reciter resolves', async () => {
    db.executor.run('DELETE FROM catalog_resources');
    db.executor.run('DELETE FROM installed_resources');
    const view = await renderUi(<MiniPlayer topVerseKey="1:1" variant="reader" />, { theme: 'light' });

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

  it.each(locales)('keeps the play triangle on the toggle unflipped in %s', async (locale) => {
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="tabs" />, { locale });

    expect(flatStyle(view.getByTestId('mini-player-toggle-icon', { includeHiddenElements: true }).props.style).transform).toBeUndefined();
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

describe('MiniPlayer sidebar variant', () => {
  // The tile is hidden from screen readers, so its queries ask for hidden elements.
  const hidden = { includeHiddenElements: true };

  it('draws nothing while the player is idle', async () => {
    setWindowWidth(1000);
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-sidebar')).toBeNull();
  });

  it.each([390, 700])('draws nothing on a window of %i wide, even while playing', async (width) => {
    setWindowWidth(width);
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-sidebar')).toBeNull();
  });

  it('shows on an expanded window while playing', async () => {
    setWindowWidth(1000);
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(view.getByTestId('mini-player-sidebar')).toBeOnTheScreen();
  });

  it('is solid, not glass: a raised surface with a line hairline and a 20 radius', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });
    const card = flatStyle(view.getByTestId('mini-player-sidebar').props.style);

    expect(card).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
      borderRadius: 20,
      borderWidth: themes.light.stroke.hairline,
      padding: 12,
    });
  });

  it('sizes the tile at 44 with radius 14, and sets the title at 17/600 and the caption at 13', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(flatStyle(view.getByTestId('mini-player-tile', hidden).props.style)).toMatchObject({
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

  it('shows the surah alone while no ayah is active', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
  });

  it('adds the ayah number to the caption while an ayah is active, read from the content database', async () => {
    setWindowWidth(1000);
    db.executor.run(`INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
       VALUES (7, '1:7', 1, 7, 1, 1, 1, 1, 'none', 'a', 'a')`);
    loadSurah('playing');
    usePlayerStore.getState().setActive(7, null);
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    expect(view.getByText('الفاتحة · الآية ٧')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة · الآية ٧' })).toBeOnTheScreen();
  });

  it('fills the inline progress track to a quarter, in the line token, with the gold fill', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });
    const track = flatStyle(view.getByTestId('mini-player-progress', hidden).props.style);
    const fill = flatStyle(view.getByTestId('mini-player-progress-fill', hidden).props.style);

    expect(track).toMatchObject({ backgroundColor: colors.line, borderRadius: 2, flexDirection: 'row', height: 3 });
    expect(track.position).toBeUndefined();
    expect(fill).toMatchObject({ backgroundColor: colors.gold, height: 3, width: '25%' });
  });

  it.each(locales)('shows the English names in %s and keeps the fill at the start edge', async (locale) => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { locale, theme: 'light' });

    expect(view.getByText(locale === 'en' ? 'Mishari Rashid' : 'مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('mini-player-progress', hidden).props.style).flexDirection).toBe('row');
  });

  it('opens the full player when the row is tapped', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة' }));

    expect(router.push).toHaveBeenCalledWith('/player');
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('pauses from the button while playing, and resumes from it while paused', async () => {
    setWindowWidth(1000);
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('resumes from the button while paused', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });

    fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));
    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });

  it('has two buttons, the row (with its hint) and the toggle, and the toggle has its own label', async () => {
    setWindowWidth(1000);
    loadSurah('paused');
    const view = await renderUi(<MiniPlayer variant="sidebar" />, { theme: 'light' });
    const row = view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة' });

    expect(row.props.accessibilityHint).toBe('يفتح المشغّل');
    expect(view.getByRole('button', { name: 'تشغيل' }).props.accessibilityState).toEqual({ disabled: false });
    expect(view.getAllByRole('button')).toHaveLength(2);
    expect(within(view.getByTestId('mini-player-sidebar')).getByTestId('mini-player-toggle')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayer.tsx')).toEqual([]);
  });
});

describe('MiniPlayer reader variant', () => {
  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
  });

  beforeEach(() => {
    db.executor.run(`INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
       VALUES (3, '1:3', 1, 3, 1, 1, 1, 1, 'none', 'a', 'a')`);
  });

  it('captions the idle bar with the surah and the top ayah on screen, and plays from that ayah', async () => {
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });

    expect(view.getByText('الفاتحة · الآية ٣')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));
    expect(playVerse).toHaveBeenCalledWith('1:3');
  });

  it('names the idle bar with the resolved reciter in English', async () => {
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { locale: 'en', theme: 'light' });

    expect(view.getByText('Mishari Rashid')).toBeOnTheScreen();
    expect(view.getByText('The Opener · Ayah 3')).toBeOnTheScreen();
  });

  it('shows the active ayah beside the surah while playing, and the gold progress line', async () => {
    loadSurah('playing');
    usePlayerStore.getState().setActive(3, null);
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });

    expect(view.getByText('الفاتحة · الآية ٣')).toBeOnTheScreen();
    expect(view.getByTestId('mini-player-progress', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws the down chevron at the top centre, in inkMuted at 70%, and it takes no touches', async () => {
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });
    const chevron = view.getByTestId('mini-player-chevron', { includeHiddenElements: true });

    expect(chevron.props.pointerEvents).toBe('none');
    expect(flatStyle(chevron.props.style)).toMatchObject({ opacity: 0.7, position: 'absolute', top: 5 });
  });

  it('gives the bar only the collapse accessibility action (the capsule expands), with the player label', async () => {
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });
    const row = view.getByTestId('mini-player-open');

    expect(row.props.accessibilityActions).toEqual([
      { label: 'تصغير المشغّل', name: 'collapse' },
    ]);
  });

  it('draws the capsule when collapsed, labelled to show the player, and a tap expands it', async () => {
    useReaderMiniCollapse.getState().setCollapsed(true);
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-reader')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'إظهار المشغّل' }));
    expect(useReaderMiniCollapse.getState().collapsed).toBe(false);
    expect(view.queryByTestId('mini-player-reader')).toBeNull();
  });

  it('puts the gold progress line on the capsule while playing, and not while idle', async () => {
    useReaderMiniCollapse.getState().setCollapsed(true);
    loadSurah('playing');
    const playing = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });
    expect(playing.getByTestId('mini-player-progress', { includeHiddenElements: true })).toBeOnTheScreen();
    playing.unmount();

    usePlayerStore.getState().reset();
    const idle = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });
    expect(idle.queryByTestId('mini-player-progress', { includeHiddenElements: true })).toBeNull();
  });

  it('hides the chevron-less capsule on an expanded window', async () => {
    setWindowWidth(1000);
    useReaderMiniCollapse.getState().setCollapsed(true);
    loadSurah('playing');
    const view = await renderUi(<MiniPlayer topVerseKey="1:3" variant="reader" />, { theme: 'light' });

    expect(view.queryByTestId('mini-player-capsule')).toBeNull();
  });
});
