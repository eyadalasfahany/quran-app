import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { tabContentClearance } from '@/core/layout/tab-bar-clearance';
import { useSavedHadithItems } from '@/features/hadith/personal';
import type { SavedHadithItem } from '@/features/hadith/personal/model';
import { PLACEHOLDER_TEXT } from '../../../../jest/hadith-ui-fixtures';
import { MyQuranScreen } from './MyQuranScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/library/data', () => ({
  deleteBookmark: jest.fn(),
  setHighlight: jest.fn(),
  useAllHighlights: () => ({ data: [] }),
  useAllNotes: () => ({ data: [] }),
  useBookmarks: () => ({ data: [] }),
}));

jest.mock('../data/saved-items', () => ({
  resolveSavedVerses: () => [],
}));

jest.mock('@/features/hadith/personal', () => ({
  useSavedHadithItems: jest.fn(() => []),
}));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
}));

describe('MyQuranScreen', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(router.navigate).mockClear();
    jest.mocked(useSavedHadithItems).mockReturnValue([]);
  });

  // Placeholder hadith, never real text: the fixture marks it as not a hadith.
  const savedHadith: SavedHadithItem = {
    saved: { collectionSlug: 'bukhari', hadithNumber: '2', bookNumber: '2', unverified: false, createdAt: 1 },
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]' },
    hadith: {
      resourceId: -1,
      id: 1,
      bookId: 7,
      chapterId: null,
      hadithNumber: '2',
      arabicNumber: null,
      position: 1,
      textAr: PLACEHOLDER_TEXT,
      collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
      book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]', position: 1 },
      chapter: null,
      sourceUrl: null,
    },
    openNumber: '2',
  };

  it('shows the Quran and Hadith kinds only on the bookmarks section, and Quran is the default', async () => {
    const view = await renderUi(<MyQuranScreen />);

    expect(view.getByRole('radio', { name: 'الحديث' })).toBeOnTheScreen();
    expect(view.getByText('لا توجد علامات بعد')).toBeOnTheScreen();

    await press(view.getByRole('tab', { name: 'التظليلات' }));
    await view.findByText('لا توجد تظليلات بعد');
    expect(view.queryByRole('radio', { name: 'الحديث' })).toBeNull();

    await press(view.getByRole('tab', { name: 'العلامات' }));
    expect(view.getByRole('radio', { name: 'القرآن' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('pressing الحديث shows the saved hadith list, and a row opens the reader', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedHadith]);
    const view = await renderUi(<MyQuranScreen />);

    await press(view.getByRole('radio', { name: 'الحديث' }));

    expect(view.queryByText('لا توجد علامات بعد')).toBeNull();
    await press(view.getByTestId('my-quran-saved-hadith-row-0'));
    expect(router.push).toHaveBeenCalledWith('/hadith/bukhari/hadith/2');
  });

  it('the empty hadith state browses the hadith home by push', async () => {
    const view = await renderUi(<MyQuranScreen />);

    await press(view.getByRole('radio', { name: 'الحديث' }));
    await press(view.getByRole('button', { name: 'تصفّح المجموعات' }));

    expect(router.push).toHaveBeenCalledWith('/hadith');
  });

  it('renders «مصحفي» with the settings gear, and the gear opens settings', async () => {
    const view = await renderUi(<MyQuranScreen />);

    expect(view.getByRole('header', { name: 'مصحفي' })).toBeOnTheScreen();

    fireEvent.press(view.getByRole('button', { name: 'الإعدادات' }));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('opens on the bookmarks section and switches sections with the segment', async () => {
    const view = await renderUi(<MyQuranScreen />);

    expect(view.getByText('لا توجد علامات بعد')).toBeOnTheScreen();

    // State updates flush on the microtask queue (React 19), so the new section is awaited.
    fireEvent.press(view.getByRole('tab', { name: 'التظليلات' }));
    await view.findByText('لا توجد تظليلات بعد');

    fireEvent.press(view.getByRole('tab', { name: 'الملاحظات' }));
    await view.findByText('لا توجد ملاحظات بعد');
  });

  it('navigates to the mushaf tab from an empty state', async () => {
    const view = await renderUi(<MyQuranScreen />);

    fireEvent.press(view.getByRole('button', { name: 'افتح المصحف' }));

    expect(router.navigate).toHaveBeenCalledWith('/(main)/(mushaf)');
  });

  it('pads the list end by the tab bar footprint plus the page gap, so the last row clears the bar', async () => {
    const originalOs = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    try {
      const view = await renderUi(<MyQuranScreen />);

      expect(view.getByTestId('screen-my-quran-list').props.contentContainerStyle.paddingBottom).toBe(
        tabContentClearance('ios', 0) + 16,
      );
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOs });
    }
  });
});
