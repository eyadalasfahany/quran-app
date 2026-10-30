import { act, fireEvent, waitFor } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { installResource, runDeviceContentSync } from '@/core/sync';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { listBookmarks } from '@/features/library/data';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { getVerseByKey } from '../data/verses';
import { resetReaderSettingsStore } from '../settings';
import { AyahPanelContent } from './AyahPanelContent';
import { resetTafsirDownloads } from './tafsir-downloads';

// A row's action is labelled with the action and then the row's title («تنزيل البقرة»).
const rowAction = (label: string) => new RegExp(`^${label} `);

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/core/sync', () => ({ installResource: jest.fn(), useCatalogVersion: jest.fn(), runDeviceContentSync: jest.fn(() => Promise.resolve()) }));

const HTML = '<p>الثناء على الله بصفاته كلها.</p>';

async function contentWithTafsir(): Promise<SqlExecutor> {
  const { executor } = await openReaderTestContent();
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (16, 'tafsirs', 1, 'sha', 0, NULL)`,
  );
  executor.run(
    `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (16, 1, 2, 2, ?)`,
    [HTML],
  );
  return executor;
}

const OTHER_HTML = '<p>تفسير ابن كثير للآية.</p>';

function installTafsir(db: SqlExecutor, resourceId: number): void {
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (?, 'tafsirs', 1, 'sha', 0, NULL)`,
    [resourceId],
  );
  db.run(
    `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, 1, 2, 2, ?)`,
    [resourceId, resourceId === 16 ? HTML : OTHER_HTML],
  );
}

// Al-Muyassar (16) and Ibn Kathir (14) in the catalogue; the listed ids are installed.
async function catalogueDb(installed: number[]): Promise<SqlExecutor> {
  const { executor } = await openReaderTestContent();
  executor.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, author_name, author_ar, language_code, direction, version, pack_size_bytes)
     VALUES (16, 'tafsirs', 'Al-Muyassar', 'التفسير الميسر', NULL, NULL, 'ar', 'rtl', 1, 1200000),
            (14, 'tafsirs', 'Ibn Kathir', 'ابن كثير', 'Hafiz Ibn Kathir', 'ابن كثير', 'ar', 'rtl', 1, 4800000)`,
  );
  for (const id of installed) {
    installTafsir(executor, id);
  }
  return executor;
}

function renderTafsir(executor: SqlExecutor, locale: 'ar' | 'en') {
  return renderUi(<AyahPanelContent executor={executor} onVerseChange={jest.fn()} tab="tafsir" verseKey="1:2" />, { locale });
}

describe('AyahPanelContent', () => {
  let withTafsir: SqlExecutor;

  beforeAll(async () => {
    withTafsir = await contentWithTafsir();
  });

  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    resetReaderSettingsStore();
    jest.mocked(installResource).mockReset();
    jest.mocked(runDeviceContentSync).mockClear();
    resetTafsirDownloads();
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

  describe('tafsir downloads', () => {
    it.each(locales)('lists the catalogue with no chips, card or stepper when nothing is installed, in %s', async (locale) => {
      const view = await renderTafsir(await catalogueDb([]), locale);

      expect(view.getByTestId('ayah-panel-content-tafsir-downloads-row-16')).toBeOnTheScreen();
      expect(view.getByTestId('ayah-panel-content-tafsir-downloads-row-14')).toBeOnTheScreen();
      expect(view.queryAllByRole('radio')).toHaveLength(0);
      expect(view.queryByTestId('ayah-panel-content-tafsir-ayah')).toBeNull();
      expect(view.queryByTestId('ayah-panel-content-tafsir-steps')).toBeNull();
    });

    it.each(locales)('starts the download from the row button, in %s', async (locale) => {
      jest.mocked(installResource).mockReturnValue(new Promise(() => {}));
      const view = await renderTafsir(await catalogueDb([]), locale);

      await fireEvent.press(view.getByTestId('ayah-panel-content-tafsir-downloads-row-16-action'));

      expect(installResource).toHaveBeenCalledWith(16, expect.objectContaining({ onProgress: expect.any(Function) }));
    });

    it.each([
      ['ar', 'عرض'],
      ['en', 'Open'],
    ] as const)('keeps the list after a download finishes, with the open pill, in %s', async (locale, openLabel) => {
      const db = await catalogueDb([]);
      jest.mocked(installResource).mockImplementation(async (id) => {
        installTafsir(db, id);
        return { status: 'installed' };
      });
      const view = await renderTafsir(db, locale);

      await fireEvent.press(view.getByTestId('ayah-panel-content-tafsir-downloads-row-16-action'));
      await waitFor(() => expect(view.getByRole('button', { name: rowAction(openLabel) })).toBeOnTheScreen());

      expect(view.queryAllByRole('radio')).toHaveLength(0);
      expect(view.queryByTestId('ayah-panel-content-tafsir-steps')).toBeNull();
      expect(view.queryByText('الثناء على الله بصفاته كلها.')).toBeNull();
    });

    it.each([
      ['ar', 'عرض'],
      ['en', 'Open'],
    ] as const)('shows the passage and the chips after «عرض» is tapped, in %s', async (locale, openLabel) => {
      const db = await catalogueDb([]);
      jest.mocked(installResource).mockImplementation(async (id) => {
        installTafsir(db, id);
        return { status: 'installed' };
      });
      const view = await renderTafsir(db, locale);
      await fireEvent.press(view.getByTestId('ayah-panel-content-tafsir-downloads-row-16-action'));
      await waitFor(() => expect(view.getByRole('button', { name: rowAction(openLabel) })).toBeOnTheScreen());

      await fireEvent.press(view.getByRole('button', { name: rowAction(openLabel) }));

      expect(view.getAllByRole('radio')).toHaveLength(2);
      expect(view.getByText('الثناء على الله بصفاته كلها.')).toBeOnTheScreen();
      expect(view.getByTestId('ayah-panel-content-tafsir-steps')).toBeOnTheScreen();
    });

    it.each(locales)('shows the row of an uninstalled chip in place of the passage, keeping the stepper, in %s', async (locale) => {
      const view = await renderTafsir(await catalogueDb([16]), locale);

      await fireEvent.press(view.getByTestId('ayah-panel-content-tafsir-option-14'));

      expect(view.getByTestId('ayah-panel-content-tafsir-download-row-14')).toBeOnTheScreen();
      expect(view.queryByText('الثناء على الله بصفاته كلها.')).toBeNull();
      expect(view.getByTestId('ayah-panel-content-tafsir-steps')).toBeOnTheScreen();
    });

    it.each([
      ['ar', 'تعذّر التنزيل'],
      ['en', 'Download failed'],
    ] as const)('starts a failed download with its failure in the subtitle, in %s', async (locale, failedLabel) => {
      jest.mocked(installResource).mockResolvedValue({ status: 'failed', reason: 'network' });
      const view = await renderTafsir(await catalogueDb([]), locale);

      await fireEvent.press(view.getByTestId('ayah-panel-content-tafsir-downloads-row-16-action'));

      await waitFor(() => expect(view.getByText(new RegExp(`^${failedLabel}`))).toBeOnTheScreen());
    });

    it.each([
      ['ar', 'إعادة المحاولة'],
      ['en', 'Try again'],
    ] as const)('runs the device sync from the empty state retry, in %s', async (locale, retryLabel) => {
      const view = await renderTafsir((await openReaderTestContent()).executor, locale);

      await act(async () => {
        await fireEvent.press(view.getByRole('button', { name: retryLabel }));
      });

      expect(runDeviceContentSync).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to the verse key without a content database', async () => {
    const view = await renderUi(<AyahPanelContent executor={null} onVerseChange={jest.fn()} tab="actions" verseKey="2:255" />);

    expect(view.getByRole('header', { name: '2:255' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/AyahPanelContent.tsx')).toEqual([]);
  });
});
