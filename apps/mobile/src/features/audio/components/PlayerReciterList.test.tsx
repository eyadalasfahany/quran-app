import { act, fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Locale } from '@/core/i18n';
import { openAudioTestDb } from '../data/test-db';
import { usePlayerStore } from '../playerStore';
import { cancelReciterPack, downloadReciterPack, resetReciterDownloads, useReciterDownloads } from '../reciter-downloads';
import {
  clearPendingPackPick,
  clearPendingPackPickFor,
  pickDownloadedReciter,
  pickInstalledReciter,
} from '../reciter-playback';
import { resetAudioSettingsStore } from '../settings';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { PlayerHost } from './PlayerHost';
import { PlayerReciterList } from './PlayerReciterList';

const mockContent: { executor: SqlExecutor | null } = { executor: null };
const mockCounts: { value: Record<number, number> } = { value: {} };

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

jest.mock('../data/downloads', () => ({
  useDoneCountsByReciter: () => mockCounts.value,
}));

jest.mock('../reciter-downloads', () => ({
  ...jest.requireActual<typeof import('../reciter-downloads')>('../reciter-downloads'),
  cancelReciterPack: jest.fn(),
  downloadReciterPack: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../reciter-playback', () => ({
  ...jest.requireActual<typeof import('../reciter-playback')>('../reciter-playback'),
  clearPendingPackPick: jest.fn(),
  clearPendingPackPickFor: jest.fn(),
  pickDownloadedReciter: jest.fn(() => Promise.resolve()),
  pickInstalledReciter: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const NAMES = {
  30: 'Mishari Rashid',
  31: 'Mahmoud Khalil',
  32: 'Abdulbasit Abdussamad',
  33: 'Islam Sobhi',
  34: 'Saad Al Ghamdi',
  35: 'Ahmed Unavailable',
} as const;

let db: { executor: SqlExecutor; close: () => void };

// The surah loaded in most tests is chapter 1. 30 and 31 are installed with chapter 1; 35 is installed with chapter 2
// only (unavailable for chapter 1); 32 is not installed; 33 is not installed and downloading; 34 is not installed and
// its download failed.
beforeEach(() => {
  db = openAudioTestDb();
  mockContent.executor = db.executor;
  mockCounts.value = {};
  resetReciterDownloads();
  usePlayerStore.getState().reset();
  jest.mocked(cancelReciterPack).mockClear();
  jest.mocked(downloadReciterPack).mockClear();
  jest.mocked(pickInstalledReciter).mockClear();
  jest.mocked(pickDownloadedReciter).mockClear();
  jest.mocked(clearPendingPackPick).mockClear();
  jest.mocked(clearPendingPackPickFor).mockClear();
  // A saved choice from an earlier test would make another reciter the current one.
  storage.remove(storageKeys.audioReciterId);
  resetAudioSettingsStore();

  for (const [id, name] of Object.entries(NAMES)) {
    db.executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default, style)
       VALUES (?, 'chapter_recitations', ?, ?, 1, 1000, 0, 'Murattal')`,
      [Number(id), name, `${name} ar`],
    );
  }
  for (const id of [30, 31, 35]) {
    db.executor.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar)
       VALUES (?, 'chapter_recitations', 1, 'a', 0, ?, ?)`,
      [id, NAMES[id as 30], `${NAMES[id as 30]} ar`],
    );
  }
  db.executor.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments)
     VALUES (1, 30, 'Mishari Rashid', 'x', 'Murattal', 0), (2, 31, 'Mahmoud Khalil', 'x', 'Muallim', 0),
            (3, 32, 'Abdulbasit Abdussamad', 'x', 'Mujawwad', 0), (4, 35, 'Ahmed Unavailable', 'x', 'Murattal', 0)`);
  db.executor.run(`INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 48000, 'mp3'),
     (101, 2, 1, 'https://example.test/2.mp3', 48000, 'mp3'),
     (102, 4, 2, 'https://example.test/4.mp3', 48000, 'mp3')`);
  useReciterDownloads.setState({
    byId: { 33: { status: 'downloading', progress: 0.4 }, 34: { status: 'failed', progress: 0 } },
    installedVersion: 0,
  });
});

afterEach(() => {
  db.close();
  mockContent.executor = null;
  useReciterDownloads.setState({ byId: {}, installedVersion: 0 });
});

function loadSurah(reciterId: number, status: 'playing' | 'paused' = 'playing') {
  usePlayerStore.getState().beginLoad({ reciterId, chapterId: 1, positionMs: 0, durationMs: 48_000 });
  usePlayerStore.getState().markPlaying();
  if (status === 'paused') {
    usePlayerStore.getState().markPaused();
  }
}

function rowIds(view: { getAllByTestId: (id: RegExp) => { props: { testID?: string } }[] }) {
  return view.getAllByTestId(/^player-reciter-\d+$/).map((row) => row.props.testID);
}

describe('PlayerReciterList', () => {
  it.each(locales)('shows the title and one row per reciter, in %s', async (locale) => {
    loadSurah(30);
    const view = await renderUi(<PlayerHost><PlayerReciterList scrollable /></PlayerHost>, { locale, theme: 'dark' });

    expect(view.getByRole('header', { name: locale === 'ar' ? 'القرّاء' : 'Reciters' })).toBeOnTheScreen();
    expect(rowIds(view)).toHaveLength(6);
  });

  it('puts the current reciter first, then the catalogue order', async () => {
    loadSurah(31);
    const view = await renderUi(<PlayerHost><PlayerReciterList scrollable /></PlayerHost>, { theme: 'dark' });

    expect(rowIds(view)).toEqual([
      'player-reciter-31',
      'player-reciter-30',
      'player-reciter-32',
      'player-reciter-33',
      'player-reciter-34',
      'player-reciter-35',
    ]);
  });

  it('shows the current reciter checked and playing, with no button', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByRole('radio', { name: 'Mishari Rashid, current reciter' }).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(view.getByText(/^Now playing/)).toBeOnTheScreen();
  });

  it('shows no playing status for the current reciter when paused', async () => {
    loadSurah(30, 'paused');
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.queryByText(/Now playing/)).toBeNull();
  });

  it('shows an installed reciter that has the surah as a switchable radio, with its downloaded count', async () => {
    loadSurah(30);
    mockCounts.value = { 31: 2 };
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByRole('radio', { name: 'Mahmoud Khalil, double-tap to listen in this voice' })).toBeOnTheScreen();
    expect(view.getByText('No follow-along · 2 surahs downloaded')).toBeOnTheScreen();
  });

  it('shows a not-downloaded reciter with a 44 pt download button that picks it for download', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByText('Not downloaded')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'Download Abdulbasit Abdussamad' }));
    expect(pickDownloadedReciter).toHaveBeenCalledWith(32);
  });

  it('shows a downloading reciter with its progress and a stop button that cancels the install', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByRole('progressbar', { name: 'Islam Sobhi' }).props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 40,
    });
    expect(view.getByText('Downloading')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'Stop download Islam Sobhi' }));
    expect(cancelReciterPack).toHaveBeenCalledWith(33);
  });

  it('shows a failed download in the not-downloaded row', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByText('Download failed')).toBeOnTheScreen();
  });

  it('shows an installed reciter without the current surah as unavailable, disabled and not a button', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByLabelText('Ahmed Unavailable').props.accessibilityState).toEqual({ disabled: true });
    expect(view.getByText('Not available for this surah')).toBeOnTheScreen();
    expect(view.queryByRole('radio', { name: /Ahmed Unavailable/ })).toBeNull();
    expect(view.queryByRole('button', { name: /Ahmed Unavailable/ })).toBeNull();
  });

  it('never shows an uninstalled reciter as unavailable, even when its pack has no file for the surah', async () => {
    db.executor.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments)
       VALUES (5, 34, 'Saad Al Ghamdi', 'x', 'Murattal', 0)`);
    db.executor.run(`INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format)
       VALUES (103, 5, 2, 'https://example.test/5.mp3', 48000, 'mp3')`);
    useReciterDownloads.setState({ byId: {}, installedVersion: 0 });
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.getByRole('button', { name: 'Download Saad Al Ghamdi' })).toBeOnTheScreen();
    expect(view.getAllByText('Not available for this surah')).toHaveLength(1);
    expect(view.queryByRole('radio', { name: /Saad Al Ghamdi/ })).toBeNull();
  });

  it('shows no unavailable row when no surah is loaded', async () => {
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    expect(view.queryByText('Not available for this surah')).toBeNull();
    // With no surah loaded, the saved reciter (the first here) is the current one and nothing is unavailable.
    expect(view.getByRole('radio', { name: 'Mishari Rashid, current reciter' }).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(view.getByRole('radio', { name: 'Mahmoud Khalil, double-tap to listen in this voice' })).toBeOnTheScreen();
    expect(view.queryByLabelText('Ahmed Unavailable')).toBeNull();
  });

  it('tapping an installed row picks that reciter, once', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    fireEvent.press(view.getByRole('radio', { name: 'Mahmoud Khalil, double-tap to listen in this voice' }));

    expect(pickInstalledReciter).toHaveBeenCalledTimes(1);
    expect(pickInstalledReciter).toHaveBeenCalledWith(31);
    expect(pickDownloadedReciter).not.toHaveBeenCalled();
  });

  it('the download button of a row without a pack picks it for download', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    fireEvent.press(view.getByTestId('player-reciter-32-action'));

    expect(pickDownloadedReciter).toHaveBeenCalledWith(32);
    expect(pickInstalledReciter).not.toHaveBeenCalled();
  });

  it('the stop button of a downloading row cancels that pack and drops its pending switch', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });

    fireEvent.press(view.getByTestId('player-reciter-33-action'));

    expect(cancelReciterPack).toHaveBeenCalledWith(33);
    expect(clearPendingPackPickFor).toHaveBeenCalledWith(33);
  });

  it('leaving the list drops a pending download switch', async () => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale: 'en', theme: 'dark' });
    expect(clearPendingPackPick).not.toHaveBeenCalled();

    await act(async () => {
      view.unmount();
    });
    expect(clearPendingPackPick).toHaveBeenCalledTimes(1);
  });

  it('scrolls inside its slot when the player fits, and keeps its natural height otherwise', async () => {
    loadSurah(30);
    const scrolling = await renderUi(<PlayerHost><PlayerReciterList scrollable /></PlayerHost>, { theme: 'dark' });
    expect(scrolling.getByTestId('player-reciters-scroll')).toBeOnTheScreen();

    const natural = await renderUi(<PlayerReciterList scrollable={false} />, { theme: 'dark' });
    expect(natural.queryByTestId('player-reciters-scroll')).toBeNull();
    expect(natural.getByTestId('player-reciters')).toBeOnTheScreen();
  });

  it.each(locales)('shows the Arabic and English names, in %s', async (locale: Locale) => {
    loadSurah(30);
    const view = await renderUi(<PlayerReciterList scrollable={false} />, { locale, theme: 'dark' });

    expect(view.getByText(locale === 'ar' ? 'Mishari Rashid ar' : 'Mishari Rashid')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerReciterList.tsx')).toEqual([]);
  });
});
