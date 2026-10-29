import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { storage, storageKeys } from '@/core/storage/mmkv';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { installResource } from '@/core/sync';

import { playChapter } from '../player';
import { usePlayerStore } from '../playerStore';
import { resetReciterDownloads } from '../reciter-downloads';
import { getReciterId, resetAudioSettingsStore } from '../settings';
import { openAudioTestDb } from '../data/test-db';

import { ListenScreen } from './ListenScreen';

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

jest.mock('../player', () => ({ playChapter: jest.fn(() => Promise.resolve()) }));
jest.mock('@/core/sync', () => ({ installResource: jest.fn() }));

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
const play = jest.mocked(playChapter);

// Afasy: installed, Murattal. Husary: installed, Muallim. Siddiq: not installed, so no style is known.
let close: () => void;

beforeEach(() => {
  const opened = openAudioTestDb();
  mockContent.executor = opened.executor;
  close = opened.close;
  const db = opened.executor;
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
     (30, 'chapter_recitations', 'Mishari Rashid Al-Afasy', 'مشاري راشد العفاسي', 1, 700000, 1),
     (31, 'chapter_recitations', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري', 1, 700000, 0),
     (32, 'chapter_recitations', 'Mohamed Siddiq Al-Minshawi', 'محمد صديق المنشاوي', 1, 700000, 0)`,
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
  storage.remove(storageKeys.audioReciterId);
  resetAudioSettingsStore();
  resetReciterDownloads();
  usePlayerStore.setState({ chapterId: null, reciterId: null, status: 'idle' });
  install.mockReset();
  play.mockClear();
});

afterEach(() => {
  mockContent.executor = null;
  close();
});

describe('ListenScreen', () => {
  it('renders the title, the search field, the filter group and every reciter in Arabic', async () => {
    const view = await renderUi(<ListenScreen />);

    expect(view.getByRole('header', { name: 'الاستماع' })).toBeOnTheScreen();
    expect(view.getByRole('search', { name: 'ابحث عن قارئ' })).toBeOnTheScreen();
    expect(view.getByLabelText('تصفية القرّاء')).toBeOnTheScreen();
    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(view.getByText('محمود خليل الحصري')).toBeOnTheScreen();
    expect(view.getByText('محمد صديق المنشاوي')).toBeOnTheScreen();
  });

  it('shows the style tag only for installed reciters, and the teaching note for Muallim', async () => {
    const view = await renderUi(<ListenScreen />);

    expect(view.getByTestId('reciter-row-30-style')).toHaveTextContent('مرتّل');
    expect(view.getByTestId('reciter-row-31-style')).toHaveTextContent('معلّم');
    expect(view.getByText('للتعليم والتكرار')).toBeOnTheScreen();
    expect(view.queryByTestId('reciter-row-32-style')).toBeNull();
  });

  it('marks the chosen reciter as checked, with the default for a fresh install', async () => {
    const view = await renderUi(<ListenScreen />);

    expect(view.getByRole('radio', { name: 'مشاري راشد العفاسي' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: 'محمود خليل الحصري' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('filters by the search text in either language', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.changeText(view.getByRole('search'), 'Husary');

    expect(view.queryByText('مشاري راشد العفاسي')).toBeNull();
    expect(view.getByText('محمود خليل الحصري')).toBeOnTheScreen();
  });

  it('shows the empty message when nothing matches', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.changeText(view.getByRole('search'), 'zzz');

    expect(view.getByTestId('reciter-empty')).toBeOnTheScreen();
    expect(view.getByText('لا يوجد قارئ مطابق')).toBeOnTheScreen();
  });

  it('filters by style from the chips, and «الكل» brings every reciter back', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'مرتّل' }));
    expect(view.queryByText('محمود خليل الحصري')).toBeNull();
    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();

    await fireEvent.press(view.getByRole('radio', { name: 'الكل' }));
    expect(view.getByText('محمود خليل الحصري')).toBeOnTheScreen();
  });

  it('keeps «المحمّلة» disabled until the downloads of step 7', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'المحمّلة' }));

    expect(view.getByRole('radio', { name: 'المحمّلة' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByRole('radio', { name: 'الكل' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('makes a reciter the default when its row is pressed', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'محمود خليل الحصري' }));

    expect(getReciterId()).toBe(31);
    expect(view.getByRole('radio', { name: 'محمود خليل الحصري' }).props.accessibilityState).toEqual({ checked: true });
    expect(play).not.toHaveBeenCalled();
  });

  it('marks the reciter that is playing with «يُتلى الآن»', async () => {
    usePlayerStore.setState({ reciterId: 30, status: 'playing' });
    const view = await renderUi(<ListenScreen />);

    expect(view.getByTestId('reciter-row-30-status')).toHaveTextContent('يُتلى الآن');
    expect(view.getByTestId('reciter-row-31-status')).toHaveTextContent('للتعليم والتكرار');
  });

  it('plays an installed reciter from its play button without installing', async () => {
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل مشاري راشد العفاسي' }));

    expect(install).not.toHaveBeenCalled();
    expect(getReciterId()).toBe(30);
    expect(play).toHaveBeenCalledWith(1);
  });

  it('installs an uninstalled reciter first, then plays it', async () => {
    install.mockResolvedValue({ status: 'installed' });
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل محمد صديق المنشاوي' }));

    expect(install).toHaveBeenCalledWith(32, expect.any(Object));
    expect(play).toHaveBeenCalledWith(1);
    expect(getReciterId()).toBe(32);
  });

  it('shows the failure on the row and does not play when the install fails', async () => {
    install.mockResolvedValue({ status: 'failed', reason: 'network' });
    const view = await renderUi(<ListenScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل محمد صديق المنشاوي' }));

    expect(await view.findByText('تعذّر التنزيل')).toBeOnTheScreen();
    expect(play).not.toHaveBeenCalled();
  });

  it.each(locales)('renders the English names under %s', async (locale) => {
    const view = await renderUi(<ListenScreen />, { locale });

    expect(view.getByRole('radio', { name: locale === 'en' ? 'Mishari Rashid Al-Afasy' : 'مشاري راشد العفاسي' })).toBeOnTheScreen();
  });
});
