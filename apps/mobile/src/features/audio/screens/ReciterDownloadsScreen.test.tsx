import { cleanup, fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { storage, storageKeys } from '@/core/storage/mmkv';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { installResource } from '@/core/sync';

import type { DownloadRow } from '../data/downloads';
import { cancel, enqueueAll, enqueueSurah, remove, removeReciter } from '../downloads/manager';
import { useDownloadProgress } from '../downloads/store';
import { usePlayerStore } from '../playerStore';
import { playSurahFromReciter, selectReciter } from '../reciter-playback';
import { downloadReciterPack, resetReciterDownloads, useReciterDownloads as usePackDownloads } from '../reciter-downloads';
import { openAudioTestDb } from '../data/test-db';
import { getReciterId, resetAudioSettingsStore } from '../settings';

import { ReciterDownloadsScreen } from './ReciterDownloadsScreen';

// The confirmation fades in, so until its animation ends its elements count as hidden to the query.
const SHOWN = { includeHiddenElements: true } as const;

const mockContent: { executor: SqlExecutor | null } = { executor: null };
const mockRows: { value: Partial<DownloadRow>[] } = { value: [] };
const mockCanGoBack = { value: true };
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

// The user database is not open under Jest: the live rows come from the test's list.
jest.mock('../data/downloads', () => ({
  ...jest.requireActual<typeof import('../data/downloads')>('../data/downloads'),
  useReciterDownloads: () => ({ data: mockRows.value }),
}));

jest.mock('../downloads/manager', () => ({
  cancel: jest.fn(),
  enqueueAll: jest.fn(() => 0),
  enqueueSurah: jest.fn(() => true),
  remove: jest.fn(),
  removeReciter: jest.fn(),
}));

jest.mock('../reciter-playback', () => ({
  playSurahFromReciter: jest.fn(() => Promise.resolve()),
  selectReciter: jest.fn(() => Promise.resolve()),
}));

jest.mock('../reciter-downloads', () => {
  const actual = jest.requireActual<typeof import('../reciter-downloads')>('../reciter-downloads');
  return { ...actual, downloadReciterPack: jest.fn(() => Promise.resolve(true)) };
});

jest.mock('@/core/sync', () => ({ installResource: jest.fn(), useCatalogVersion: (selector: (state: { version: number; syncSettled: boolean }) => unknown) =>
    selector({ syncSettled: true, version: 0 }) }));

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('expo-router')>('expo-router'),
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack.value,
    replace: (href: string) => mockReplace(href),
  },
}));

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

const install = jest.mocked(installResource);
const packDownload = jest.mocked(downloadReciterPack);
const enqueue = jest.mocked(enqueueSurah);
const enqueueEverything = jest.mocked(enqueueAll);
const stop = jest.mocked(cancel);
const deleteOne = jest.mocked(remove);
const deleteReciter = jest.mocked(removeReciter);
const playSurah = jest.mocked(playSurahFromReciter);

let close: () => void;

function row(audioFileId: number, chapterId: number, overrides: Partial<DownloadRow> = {}): Partial<DownloadRow> {
  return { audioFileId, chapterId, reciterResourceId: 30, status: 'queued', progress: 0, sizeBytes: null, ...overrides };
}

beforeEach(() => {
  const opened = openAudioTestDb();
  mockContent.executor = opened.executor;
  close = opened.close;
  const db = opened.executor;
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default, style) VALUES
     (30, 'chapter_recitations', 'Mishari Rashid Al-Afasy', 'مشاري راشد العفاسي', 1, 700000, 1, 'Murattal'),
     (31, 'chapter_recitations', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري', 1, 700000, 0, 'Muallim'),
     (32, 'chapter_recitations', 'Mohamed Siddiq Al-Minshawi', 'محمد صديق المنشاوي', 1, 700000, 0, 'Murattal')`,
  );
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (30, 'chapter_recitations', 1, 'a', 0, 'Mishari', 'مشاري'),
     (31, 'chapter_recitations', 1, 'b', 0, 'Husary', 'الحصري')`,
  );
  db.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES
     (1, 30, 'Mishari', 'مشاري', 'Murattal', 1),
     (2, 31, 'Husary', 'الحصري', 'Muallim', 1)`,
  );
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opener', 'makkah', 5, 7, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 286, 1, 2, 49),
     (3, 'آل عمران', 'Ali Imran', 'Family of Imran', 'madinah', 89, 200, 1, 50, 76)`,
  );
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', NULL, 1000, 'mp3'),
     (101, 1, 3, 'https://example.test/3.mp3', NULL, 1000, 'mp3'),
     (102, 2, 2, 'https://example.test/2.mp3', NULL, 1000, 'mp3')`,
  );
  storage.remove(storageKeys.audioReciterId);
  resetAudioSettingsStore();
  resetReciterDownloads();
  useDownloadProgress.setState({ byId: {} });
  mockRows.value = [];
  mockCanGoBack.value = true;
  jest.clearAllMocks();
  packDownload.mockImplementation(() => Promise.resolve(true));
});

afterEach(() => {
  cleanup();
  close();
  mockContent.executor = null;
});

describe('ReciterDownloadsScreen', () => {
  it('mounting the page does not select or switch a reciter (selection happens on the Listen row)', async () => {
    const before = getReciterId();

    await renderUi(<ReciterDownloadsScreen resourceId={31} />);

    expect(getReciterId()).toBe(before);
    expect(selectReciter).not.toHaveBeenCalled();
    expect(playSurah).not.toHaveBeenCalled();
  });

  describe('header', () => {
    it('shows the reciter name as the large title, with the style and the count under it', async () => {
      mockRows.value = [row(100, 1, { status: 'done', sizeBytes: 5_033_165 })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByRole('header', { name: 'مشاري راشد العفاسي' })).toBeOnTheScreen();
      expect(view.getByText('مرتّل · ١ من ٢ محمّلة')).toBeOnTheScreen();
    });

    it('goes back from the back button, and to the Listen tab when nothing is under it', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      await fireEvent.press(view.getByRole('button', { name: 'رجوع' }));
      expect(mockBack).toHaveBeenCalledTimes(1);

      mockCanGoBack.value = false;
      await fireEvent.press(view.getByRole('button', { name: 'رجوع' }));
      expect(mockReplace).toHaveBeenCalledWith('/(main)/(listen)');
    });
  });

  describe('surah list', () => {
    it('draws one row per surah in surah order, titled with its name', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByTestId('surah-row-1')).toBeOnTheScreen();
      expect(view.getByTestId('surah-row-2')).toBeOnTheScreen();
      expect(view.getByTestId('surah-row-3')).toBeOnTheScreen();
      expect(view.getByText('الفاتحة')).toBeOnTheScreen();
      expect(view.getByText('آل عمران')).toBeOnTheScreen();
    });

    it('shows an unavailable surah dimmed and not pressable, and the others keep their actions', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      // Surah 2 has no audio for this reciter (the fixture gives it to another reciter).
      expect(view.getByText('غير متوفرة')).toBeOnTheScreen();
      expect(view.getByTestId('surah-row-2').props.accessibilityState).toEqual({ disabled: true });
      expect(view.queryByTestId('surah-row-2-action')).toBeNull();
      expect(view.queryByTestId('surah-row-2-delete')).toBeNull();
      expect(view.getByTestId('surah-row-1-action')).toBeOnTheScreen();
      expect(view.getByTestId('surah-row-3-action')).toBeOnTheScreen();
    });

    it('offers the download for a surah with no row, and calls enqueueSurah', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      await fireEvent.press(view.getByTestId('surah-row-1-action'));

      expect(enqueue).toHaveBeenCalledWith(30, 1);
    });

    it('shows a queued surah with the stop button, which cancels its row', async () => {
      mockRows.value = [row(100, 1, { status: 'queued' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByText('في الانتظار')).toBeOnTheScreen();
      await fireEvent.press(view.getByRole('button', { name: /^إيقاف التنزيل / }));

      expect(stop).toHaveBeenCalledWith(100);
    });

    it('shows a downloading surah with live progress from the download store', async () => {
      mockRows.value = [row(100, 1, { status: 'downloading', progress: 0.1 })];
      useDownloadProgress.setState({ byId: { 100: 0.58 } });
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 58 });
    });

    it('shows a waiting surah as waiting for Wi-Fi and a paused one as paused', async () => {
      mockRows.value = [row(100, 1, { status: 'waiting_wifi' }), row(101, 3, { status: 'paused' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByText('بانتظار Wi-Fi')).toBeOnTheScreen();
      expect(view.getByText('متوقف')).toBeOnTheScreen();
    });

    it('offers the download again for a failed surah, with the failure as its subtitle', async () => {
      mockRows.value = [row(100, 1, { status: 'failed' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByText('تعذّر التنزيل')).toBeOnTheScreen();
      await fireEvent.press(view.getByTestId('surah-row-1-action'));

      expect(enqueue).toHaveBeenCalledWith(30, 1);
    });

    it('shows a done surah with its size, plays it from the pill and deletes its file from the trailing button', async () => {
      mockRows.value = [row(100, 1, { status: 'done', sizeBytes: 5_033_165, verifiedAt: Date.now() })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByText('٤٫٨ م.ب')).toBeOnTheScreen();
      await fireEvent.press(view.getByTestId('surah-row-1-action'));
      expect(playSurah).toHaveBeenCalledWith(30, 1);

      await fireEvent.press(view.getByTestId('surah-row-1-delete'));
      expect(deleteOne).toHaveBeenCalledWith(100);
    });
  });

  describe('while a surah starts', () => {
    afterEach(() => {
      usePlayerStore.getState().reset();
    });

    it('draws the buffering ring on only the surah that starts', async () => {
      mockRows.value = [
        row(100, 1, { status: 'done', sizeBytes: 5_033_165 }),
        row(101, 3, { status: 'done', sizeBytes: 5_033_165 }),
      ];
      usePlayerStore.setState({ startingTarget: { kind: 'surah', resourceId: 30, chapterId: 1 } });
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByTestId('surah-row-1-buffering', { includeHiddenElements: true })).toBeTruthy();
      expect(view.queryByTestId('surah-row-3-buffering', { includeHiddenElements: true })).toBeNull();
      expect(view.getByTestId('surah-row-1-action').props.accessibilityState).toEqual({ busy: true });
      await fireEvent.press(view.getByTestId('surah-row-1-action'));
      expect(playSurah).not.toHaveBeenCalled();
    });
  });

  describe('bulk actions', () => {
    it('calls enqueueAll from «تنزيل الكل»', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      await fireEvent.press(view.getByRole('button', { name: 'تنزيل الكل' }));

      expect(enqueueEverything).toHaveBeenCalledWith(30);
      expect(enqueueEverything).toHaveBeenCalledTimes(1);
    });

    it('Download all still queues only surahs with audio', async () => {
      // enqueueAll is mocked here: its own filter is tested in downloads/manager.test.ts. The page offers an action
      // only for the two surahs with audio, and the one it calls queues just those.
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);
      const actionable = ['surah-row-1-action', 'surah-row-3-action'].filter((id) => view.queryByTestId(id) !== null);

      await fireEvent.press(view.getByRole('button', { name: 'تنزيل الكل' }));

      expect(actionable).toHaveLength(2);
      expect(enqueueEverything).toHaveBeenCalledTimes(1);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('hides «حذف التنزيلات» when nothing is downloaded', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.queryByRole('button', { name: 'حذف التنزيلات' })).toBeNull();
    });

    it('shows «حذف التنزيلات» when something is downloaded', async () => {
      mockRows.value = [row(100, 1, { status: 'done' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(view.getByRole('button', { name: 'حذف التنزيلات' })).toBeOnTheScreen();
    });

    it('asks first with a destructive «حذف» and a «إلغاء», and removes the reciter only on confirm', async () => {
      mockRows.value = [row(100, 1, { status: 'done' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      await fireEvent.press(view.getByRole('button', { name: 'حذف التنزيلات' }));

      // The confirmation fades in, so its elements count as hidden to the query until the animation ends.
      expect(view.getByText('حذف التنزيلات؟', SHOWN)).toBeOnTheScreen();
      expect(view.getByRole('button', { name: 'إلغاء', ...SHOWN })).toBeOnTheScreen();
      expect(deleteReciter).not.toHaveBeenCalled();

      await fireEvent.press(view.getByRole('button', { name: 'حذف', ...SHOWN }));
      expect(deleteReciter).toHaveBeenCalledWith(30);
    });

    it('keeps the downloads when the removal is cancelled', async () => {
      mockRows.value = [row(100, 1, { status: 'done' })];
      const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      await fireEvent.press(view.getByRole('button', { name: 'حذف التنزيلات' }));
      await fireEvent.press(view.getByRole('button', { name: 'إلغاء', ...SHOWN }));

      expect(deleteReciter).not.toHaveBeenCalled();
    });
  });

  describe('pack install', () => {
    it('installs the pack first when the reciter is not installed, and lists nothing until then', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={32} />);

      expect(packDownload).toHaveBeenCalledWith(32);
      // The surah list's place is a loading region while the pack installs; the header stays.
      const loading = view.getByTestId('reciter-installing');
      expect(loading.props.accessibilityLabel).toBe('جارٍ التحميل');
      expect(loading.props.accessibilityState).toEqual({ busy: true });
      expect(view.queryByText('جارٍ تنزيل بيانات القارئ')).toBeNull();
      expect(view.queryByRole('button', { name: 'تنزيل الكل' })).toBeNull();
      expect(view.queryByTestId('surah-row-1')).toBeNull();
    });

    it('does not install a reciter whose pack is already there', async () => {
      await renderUi(<ReciterDownloadsScreen resourceId={30} />);

      expect(packDownload).not.toHaveBeenCalled();
      expect(install).not.toHaveBeenCalled();
    });

    it('offers «إعادة المحاولة» after a failed install, and installs again from it', async () => {
      packDownload.mockImplementation(() => Promise.resolve(false));
      usePackDownloads.setState({ byId: { 32: { status: 'failed', progress: 0 } } });
      const view = await renderUi(<ReciterDownloadsScreen resourceId={32} />);

      expect(view.getByText('تعذّر تنزيل بيانات القارئ')).toBeOnTheScreen();
      const callsBefore = packDownload.mock.calls.length;
      await fireEvent.press(view.getByRole('button', { name: 'إعادة المحاولة' }));

      expect(packDownload.mock.calls.length).toBe(callsBefore + 1);
    });

    it('says the reciter was not found for an id the catalogue does not have, and installs nothing', async () => {
      const view = await renderUi(<ReciterDownloadsScreen resourceId={999} />);

      expect(view.getByText('لم نجد هذا القارئ')).toBeOnTheScreen();
      expect(packDownload).not.toHaveBeenCalled();
    });
  });

  it('keeps the list clear of the mini bar, with the tabs footprint as its bottom inset while the bar shows', async () => {
    const { usePlayerStore } = jest.requireActual<typeof import('../playerStore')>('../playerStore');
    usePlayerStore.setState({ chapterId: 1, reciterId: 30, status: 'playing' });
    const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />);
    const list = view.getByTestId('reciter-downloads-list');

    expect(flatStyle(list.props.contentContainerStyle).paddingBottom).toBeGreaterThan(0);
    usePlayerStore.setState({ chapterId: null, reciterId: null, status: 'idle' });
  });

  it.each(['ar', 'en'] as const)('renders the page under %s', async (locale) => {
    mockRows.value = [row(100, 1, { status: 'done', sizeBytes: 5_033_165 })];
    const view = await renderUi(<ReciterDownloadsScreen resourceId={30} />, { locale });

    expect(view.getByRole('header', { name: locale === 'en' ? 'Mishari Rashid Al-Afasy' : 'مشاري راشد العفاسي' })).toBeOnTheScreen();
    expect(view.getByText(locale === 'en' ? 'Al-Fatihah' : 'الفاتحة')).toBeOnTheScreen();
    expect(view.getByText(locale === 'en' ? 'Ali Imran' : 'آل عمران')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'en' ? 'Download all' : 'تنزيل الكل' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'en' ? 'Back' : 'رجوع' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/screens/ReciterDownloadsScreen.tsx')).toEqual([]);
  });
});
