import { act, fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { listBookmarks } from '@/features/library/data';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { getVerseByKey } from '../data/verses';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { AyahPanelContent } from './AyahPanelContent';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

const HTML = '<p>الثناء على الله بصفاته كلها.</p>';

async function contentWithTafsir(): Promise<SqlExecutor> {
  const { executor } = await openReaderTestContent();
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (16, 'tafsirs', 1, 'sha', 0, NULL), (20, 'translations', 1, 'sha', 0, NULL)`,
  );
  executor.run(
    `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (16, 1, 2, 2, ?)`,
    [HTML],
  );
  executor.run(
    `INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (20, 2, 'All praise is due to Allah', NULL)`,
  );
  return executor;
}

describe('AyahPanelContent', () => {
  let withTafsir: SqlExecutor;
  let bare: SqlExecutor;

  beforeAll(async () => {
    withTafsir = await contentWithTafsir();
    bare = (await openReaderTestContent()).executor;
  });

  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    resetReaderSettingsStore();
  });

  it.each(locales)('shows the header with the Arabic surah name in %s', async (locale) => {
    const view = await renderUi(
      <AyahPanelContent executor={withTafsir} onVerseChange={jest.fn()} store={openUserTestStore().store} tab="actions" verseKey="1:2" />,
      { locale },
    );

    const title = locale === 'ar' ? 'الفاتحة · الآية ٢' : 'الفاتحة · Ayah 2';
    expect(view.getByTestId('ayah-panel-content-header-title')).toHaveTextContent(title);
    expect(view.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(view.getByTestId('ayah-panel-content-header-subtitle')).toHaveTextContent(
      locale === 'ar' ? 'صفحة ١ · الجزء ١' : 'Page 1 · Juz 1',
    );
  });

  it('bookmarks the ayah through the user.db repository', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(
      <AyahPanelContent executor={withTafsir} onVerseChange={jest.fn()} store={store} tab="actions" verseKey="1:2" />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Bookmark' }));

    expect(listBookmarks(store).map((bookmark) => bookmark.verseId)).toEqual([getVerseByKey(withTafsir, '1:2')?.id]);
  });

  it('opens the tafsir tab from the actions grid', async () => {
    const onTabChange = jest.fn();
    const view = await renderUi(
      <AyahPanelContent
        executor={withTafsir}
        onTabChange={onTabChange}
        onVerseChange={jest.fn()}
        store={openUserTestStore().store}
        tab="actions"
        verseKey="1:2"
      />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Tafsir' }));

    expect(onTabChange).toHaveBeenCalledWith('tafsir');
  });

  it('keeps the Uthmani ayah right to left and right-aligned in the English tafsir card', async () => {
    const view = await renderUi(
      <AyahPanelContent executor={withTafsir} onVerseChange={jest.fn()} tab="tafsir" verseKey="1:2" />,
      { locale: 'en' },
    );

    expect(view.getByTestId('ayah-panel-content-tafsir-ayah-text').props.children).toBe(
      getVerseByKey(withTafsir, '1:2')?.textUthmani,
    );
    expect(flatStyle(view.getByTestId('ayah-panel-content-tafsir-ayah-block').props.style)).toMatchObject({
      textAlign: 'right',
      writingDirection: 'rtl',
    });
    expect(view.getByText('الثناء على الله بصفاته كلها.')).toBeOnTheScreen();
  });

  it('moves the tafsir to the previous and next ayah', async () => {
    const onVerseChange = jest.fn();
    const view = await renderUi(
      <AyahPanelContent executor={withTafsir} onVerseChange={onVerseChange} tab="tafsir" verseKey="1:2" />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Previous ayah' }));
    await fireEvent.press(view.getByRole('button', { name: 'Next ayah' }));

    expect(onVerseChange.mock.calls).toEqual([['1:1'], ['1:3']]);
  });

  it('offers the chosen tafsir for download when it is not installed', async () => {
    await act(async () => {
      useReaderSettings.getState().setTafsirId(16);
    });
    const view = await renderUi(<AyahPanelContent executor={bare} onVerseChange={jest.fn()} tab="tafsir" verseKey="1:2" />, {
      locale: 'en',
    });

    expect(view.getByText('No tafsir downloaded')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'Download this tafsir for offline reading' }));

    expect(useReaderSettings.getState()).toMatchObject({ tafsirChosen: true, tafsirId: 16 });
  });

  it('lists the selected translations and saves the inline toggle in the reader settings', async () => {
    await act(async () => {
      useReaderSettings.getState().setTranslationIds([20]);
    });
    const view = await renderUi(
      <AyahPanelContent executor={withTafsir} onVerseChange={jest.fn()} tab="translation" verseKey="1:2" />,
      { locale: 'en' },
    );

    expect(view.getByText('All praise is due to Allah')).toBeOnTheScreen();
    await fireEvent(view.getByRole('switch', { name: 'Show translations in Reading mode' }), 'valueChange', false);

    expect(useReaderSettings.getState().showTranslations).toBe(false);
    expect(JSON.parse(storage.getString(storageKeys.readerSettings) ?? '{}')).toMatchObject({ showTranslations: false });
  });

  it('falls back to the verse key without a content database', async () => {
    const view = await renderUi(<AyahPanelContent executor={null} onVerseChange={jest.fn()} tab="actions" verseKey="2:255" />);

    expect(view.getByRole('header', { name: '2:255' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/AyahPanelContent.tsx')).toEqual([]);
  });
});
