import { fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';
import { openAudioTestDb } from '../data/test-db';
import { nextAyah, pause, previousAyah, resume, seek } from '../player';
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
    expect(view.getByText('مرتّل')).toBeOnTheScreen();
    expect(view.getByTestId('reciter-artwork', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(view.getByText('ع', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows the English names and style when the app is in English', async () => {
    loadSurah('paused');
    const view = await renderUi(<PlayerScreen />, { locale: 'en', theme: 'dark' });

    expect(view.getByText('Mishari Rashid')).toBeOnTheScreen();
    expect(view.getByText('Surah The Opener')).toBeOnTheScreen();
    expect(view.getByText('Murattal')).toBeOnTheScreen();
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

  it('matches the frame numbers in Arabic: artwork, play, transport, progress, options, ayah card and padding', async () => {
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

    expect(style('reciter-artwork', hidden)).toMatchObject({ height: 220, width: 220, borderRadius: 32 });
    expect(style('player-toggle')).toMatchObject({ height: 76, width: 76, borderRadius: 38 });
    expect(style('player-previous')).toMatchObject({ height: 52, width: 52 });
    expect(style('player-next')).toMatchObject({ height: 52, width: 52 });
    expect(style('player-transport')).toMatchObject({ gap: 28 });
    expect(style('player-progress-track', hidden)).toMatchObject({ height: 4, borderRadius: 2 });
    expect(style('player-options')).toMatchObject({ borderRadius: 28, padding: 6 });
    expect(style('now-playing-ayah')).toMatchObject({ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 });
    expect(flatStyle(view.getByTestId('player-scroll').props.contentContainerStyle)).toMatchObject({ paddingHorizontal: 24 });
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
});
