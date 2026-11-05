import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';
import { openAudioTestDb } from '../data/test-db';
import { nextAyah, pause, previousAyah, resume, seek } from '../player';
import { AYAH_CARD_ONE_LINE_HEIGHT, RECITERS_LIST_MIN_HEIGHT } from '../player-fit';
import { usePlayerStore } from '../playerStore';

import { PlayerScreen } from './PlayerScreen';

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
  nextAyah: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  previousAyah: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  seek: jest.fn(),
}));

// The downloaded surahs per reciter come from the user database, which is not open under Jest.
jest.mock('../data/downloads', () => ({
  useDoneCountsByReciter: () => ({}),
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
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

const dark = themes.dark.colors;

let db: { executor: SqlExecutor; close: () => void };

beforeEach(() => {
  db = openAudioTestDb();
  mockContent.executor = db.executor;
  // Surah 1 with seven ayahs, Al-Fatiha in both languages.
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
  jest.mocked(seek).mockClear();
  jest.mocked(router.back).mockClear();
});

afterEach(() => {
  db.close();
  mockContent.executor = null;
  I18nManager.isRTL = false;
});

function loadSurah(status: 'playing' | 'paused' | 'loading' = 'paused') {
  usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 24_000, durationMs: 48_000 });
  if (status === 'playing') {
    usePlayerStore.getState().markPlaying();
  } else if (status === 'paused') {
    usePlayerStore.getState().markPlaying();
    usePlayerStore.getState().markPaused();
  }
}

describe('PlayerScreen', () => {
  it('shows the reciter, the surah with its style, and the transport, in Arabic', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('header', { name: 'مشاري راشد العفاسي' })).toBeOnTheScreen();
    expect(view.getByText('سورة الفاتحة')).toBeOnTheScreen();
    // The reciter's style shows in the title and again on the reciter's row, so the title is searched on its own.
    expect(within(view.getByTestId('player-part-title')).getByText('مرتّل')).toBeOnTheScreen();
    expect(view.queryByTestId('reciter-artwork', { includeHiddenElements: true })).toBeNull();
  });

  it('shows the reciters list below the options', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    const slot = view.getByTestId('player-reciters-slot');
    expect(within(slot).getByRole('header', { name: 'القرّاء' })).toBeOnTheScreen();
    expect(within(slot).getByRole('radio', { name: 'مشاري راشد العفاسي، القارئ الحالي' })).toBeOnTheScreen();
  });

  it('shows the English names and style when the app is in English', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { locale: 'en', theme: 'dark' });

    expect(within(view.getByTestId('player-part-title')).getByText('Mishari Rashid')).toBeOnTheScreen();
    expect(view.getByText('Surah Al-Fatiha')).toBeOnTheScreen();
    expect(within(view.getByTestId('player-part-title')).getByText('Murattal')).toBeOnTheScreen();
  });

  it('shows elapsed and total in Arabic digits', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByTestId('player-elapsed')).toHaveTextContent('٠:٢٤');
    expect(view.getByTestId('player-total')).toHaveTextContent('٠:٤٨');
  });

  it('shows the play button and no ayah card while idle', async () => {
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
    expect(view.queryByTestId('now-playing-ayah')).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('shows the pause button while playing, and pauses on press', async () => {
    loadSurah('playing');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('button', { name: 'إيقاف مؤقت' })).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('shows the pause button while loading', async () => {
    loadSurah('loading');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('button', { name: 'إيقاف مؤقت' })).toBeOnTheScreen();
  });

  it('resumes when paused and the play button is pressed', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));
    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });

  it('closes the player with the minimize button, sliding it down before leaving the route', async () => {
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    await fireEvent.press(view.getByRole('button', { name: 'تصغير المشغّل' }));
    expect(router.back).not.toHaveBeenCalled();
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('seeks through the progress control with the position in milliseconds', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    fireEvent(view.getByRole('adjustable', { name: 'التقدم' }), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(seek).toHaveBeenCalledWith(34_000);
  });

  it('shows the error message in place of the ayah card, and the play button', async () => {
    loadSurah('paused');
    usePlayerStore.getState().markFailed('not-found');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('alert')).toHaveTextContent('الملف الصوتي غير متوفر الآن.');
    expect(view.queryByTestId('now-playing-ayah')).toBeNull();
    expect(view.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('shows the ayah card when an ayah is active, with the Imla\'i label and the counter', async () => {
    db.executor.run(`INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah,
       text_uthmani, text_imlaei, text_search) VALUES (5, '1:5', 1, 5, 1, 1, 1, 1, 'none', 'إِيَّاكَ نَعْبُدُ', 'iyyaka na3budu', 'x')`);
    db.executor.run(`INSERT INTO words (verse_id, position, char_type, text_uthmani, text_imlaei) VALUES
       (5, 1, 'word', 'إِيَّاكَ', 'iyyaka'), (5, 2, 'word', 'نَعْبُدُ', 'na3budu'), (5, 3, 'end', '٥', '5')`);
    loadSurah('paused');
    usePlayerStore.setState({ activeVerseId: 5, activeWord: 2 });
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByTestId('now-playing-ayah')).toBeOnTheScreen();
    expect(view.getByLabelText('iyyaka na3budu الآية ٥')).toBeOnTheScreen();
    expect(view.getByTestId('now-playing-counter')).toHaveTextContent('الآية ٥ من ٧');
    expect(flatStyle(view.getByText('نَعْبُدُ').props.style).color).toBe(dark.playerAccent);
    expect(flatStyle(view.getByText('إِيَّاكَ').props.style).color).toBe(dark.playerInk);
  });

  it('keeps the previous and next ayah buttons disabled until steps are available', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });

    expect(view.getByRole('button', { name: 'الآية السابقة' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'الآية التالية' })).toBeDisabled();
  });

  it.each(locales)('disables the options bar items in %s', async (locale) => {
    const view = await renderUi(<PlayerScreen />, { locale, theme: 'dark' });

    expect(view.getByTestId('player-options')).toBeOnTheScreen();
    expect(view.getAllByRole('button').filter((button) => button.props.accessibilityState?.disabled).length).toBeGreaterThanOrEqual(4);
  });

  it('matches the frame numbers in Arabic: play, transport, progress, options, ayah card and padding', async () => {
    db.executor.run(`INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah,
       text_uthmani, text_imlaei, text_search) VALUES (5, '1:5', 1, 5, 1, 1, 1, 1, 'none', 'إِيَّاكَ نَعْبُدُ', 'iyyaka na3budu', 'x')`);
    db.executor.run(`INSERT INTO words (verse_id, position, char_type, text_uthmani, text_imlaei) VALUES
       (5, 1, 'word', 'إِيَّاكَ', 'iyyaka'), (5, 2, 'word', 'نَعْبُدُ', 'na3budu')`);
    loadSurah('paused');
    usePlayerStore.setState({ activeVerseId: 5, activeWord: 1 });
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });
    const hidden = { includeHiddenElements: true };
    const style = (testID: string, options?: { includeHiddenElements: boolean }) =>
      flatStyle(view.getByTestId(testID, options).props.style);

    expect(style('player-toggle')).toMatchObject({ height: 76, width: 76, borderRadius: 38 });
    expect(style('player-previous')).toMatchObject({ height: 52, width: 52 });
    expect(style('player-next')).toMatchObject({ height: 52, width: 52 });
    expect(style('player-transport')).toMatchObject({ gap: 28 });
    expect(style('player-progress-track', hidden)).toMatchObject({ height: 4, borderRadius: 2 });
    expect(style('player-options')).toMatchObject({ borderRadius: 28, padding: 6 });
    expect(style('now-playing-ayah')).toMatchObject({ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 });
    expect(flatStyle(view.getByTestId('player-column').props.style)).toMatchObject({
      paddingEnd: 24,
      paddingStart: 24,
      paddingTop: 52,
      paddingBottom: 30,
    });
    expect(view.getByRole('button', { name: 'تصغير المشغّل' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'الآية السابقة' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'الآية التالية' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/screens/PlayerScreen.tsx')).toEqual([]);
  });

  it('steps to the previous and next ayah through the engine, enabled once timings exist', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { theme: 'dark' });
    expect(view.getByRole('button', { name: 'الآية السابقة' })).toBeDisabled();

    usePlayerStore.setState({ activeVerseId: 5, activeWord: null });
    const enabled = await renderUi(<PlayerScreen />, { theme: 'dark' });
    await fireEvent.press(enabled.getByRole('button', { name: 'الآية التالية' }));
    await fireEvent.press(enabled.getByRole('button', { name: 'الآية السابقة' }));
    expect(nextAyah).toHaveBeenCalledTimes(1);
    expect(previousAyah).toHaveBeenCalledTimes(1);
  });

  describe('column layout', () => {
    // The window's height as the screen reports it, and the fixed parts' natural heights on an iPhone 17 frame.
    // The column's available height is the screen less the 52 and 30 pt frame padding.
    const layoutOf = (height: number) => ({ nativeEvent: { layout: { height, width: 350, x: 0, y: 0 } } });
    const frameParts = { header: 44, options: 74, progress: 25, title: 56, transport: 76 } as const;
    const hidden = { includeHiddenElements: true };

    function insertLongVerse(words: number) {
      const rows = Array.from({ length: words }, (_, index) => `(5, ${index + 1}, 'word', 'كلمة', 'kalima')`).join(', ');
      db.executor.run(`INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah,
         text_uthmani, text_imlaei, text_search) VALUES (5, '1:5', 1, 5, 1, 1, 1, 1, 'none', 'إِيَّاكَ نَعْبُدُ', 'iyyaka na3budu', 'x')`);
      db.executor.run(`INSERT INTO words (verse_id, position, char_type, text_uthmani, text_imlaei) VALUES ${rows}`);
    }

    // Measures the screen and each part as the layout reports them. The card reports its text height.
    async function measure(view: Awaited<ReturnType<typeof renderUi>>, screen: number, parts: Partial<Record<keyof typeof frameParts, number>>, text: number) {
      await fireEvent(view.getByTestId('player-screen'), 'layout', layoutOf(screen));
      for (const [part, height] of Object.entries({ ...frameParts, ...parts })) {
        await fireEvent(view.getByTestId(`player-part-${part}`), 'layout', layoutOf(height));
      }
      await fireEvent(view.getByLabelText(/الآية ٥$/), 'layout', layoutOf(text));
    }

    async function renderLongVerse() {
      insertLongVerse(2);
      loadSurah('paused');
      usePlayerStore.setState({ activeVerseId: 5, activeWord: 1 });
      return renderUi(<PlayerScreen />, { theme: 'dark' });
    }

    it('shows no artwork, and the ayah card has no fixed height', async () => {
      const view = await renderLongVerse();
      await measure(view, 844, {}, 52.5);

      expect(view.queryByTestId('reciter-artwork', hidden)).toBeNull();
      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).height).toBeUndefined();
    });

    it('keeps an iPhone 17 with a one-line ayah on one page: the card at its text height, the list at least 136 pt', async () => {
      const view = await renderLongVerse();
      // 844 - 52 - 30 = 762 pt available, less 275 of fixed parts and six 20 pt gaps: 231 pt above the list's floor.
      await measure(view, 844, {}, 52.5);

      expect(view.queryByTestId('player-scroll')).toBeNull();
      expect(view.getByTestId('player-column')).toBeOnTheScreen();
      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).maxHeight).toBe(231);
      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).height).toBeUndefined();
      expect(flatStyle(view.getByTestId('player-reciters-slot').props.style)).toMatchObject({
        flex: 1,
        minHeight: RECITERS_LIST_MIN_HEIGHT,
      });
      expect(RECITERS_LIST_MIN_HEIGHT).toBe(136);
    });

    it('caps a long ayah on an iPhone 17 at the room, scrolls its own text, and still has no page scroll', async () => {
      const view = await renderLongVerse();
      await measure(view, 844, {}, 600);

      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).maxHeight).toBe(231);
      expect(flatStyle(view.getByTestId('now-playing-scroll').props.style)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
      expect(view.queryByTestId('player-scroll')).toBeNull();
      expect(view.getByTestId('player-transport')).toBeOnTheScreen();
      expect(view.getByTestId('player-options')).toBeOnTheScreen();
      expect(view.getByTestId('player-reciters-slot')).toBeOnTheScreen();
      expect(view.getByTestId('now-playing-counter')).toBeOnTheScreen();
    });

    it('allows a page scroll on a very short window (about 330 pt, a landscape phone)', async () => {
      const view = await renderLongVerse();
      await measure(view, 330, {}, 52.5);

      expect(view.getByTestId('player-scroll').props.scrollEnabled).toBe(true);
      expect(view.queryByTestId('player-column')).toBeNull();
      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).maxHeight).toBe(AYAH_CARD_ONE_LINE_HEIGHT);
      expect(view.getByTestId('player-options')).toBeOnTheScreen();
    });

    it('scrolls the whole column only when even a one-line card and the list floor do not fit', async () => {
      const view = await renderLongVerse();
      // A very large text size makes the header far taller than the frame's.
      await measure(view, 844, { header: 700 }, 600);

      expect(view.getByTestId('player-scroll').props.scrollEnabled).toBe(true);
      expect(view.queryByTestId('player-column')).toBeNull();
      expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).maxHeight).toBe(AYAH_CARD_ONE_LINE_HEIGHT);
      expect(view.getByTestId('player-options')).toBeOnTheScreen();
    });

    it('renders the reciters slot below the utility bar, flexible and at least the list floor', async () => {
      const view = await renderLongVerse();
      await measure(view, 844, {}, 52.5);

      expect(flatStyle(view.getByTestId('player-reciters-slot').props.style)).toMatchObject({ flex: 1, minHeight: 136 });
      expect(within(view.getByTestId('player-reciters-slot')).getByTestId('player-reciters')).toBeOnTheScreen();
    });
  });
});
