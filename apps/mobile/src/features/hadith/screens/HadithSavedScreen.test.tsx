import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { useSavedHadithItems } from '../personal';
import type { SavedHadithItem } from '../personal/model';
import type { HadithDetail } from '../types';

import { HadithSavedScreen } from './HadithSavedScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../personal', () => ({
  useSavedHadithItems: jest.fn(() => []),
}));

// Placeholders only.
const TEXT = 'نص تجريبي ١ — ليس حديثًا';

function detail(hadithNumber: string): HadithDetail {
  return {
    resourceId: -1,
    id: 1,
    bookId: 7,
    chapterId: null,
    hadithNumber,
    arabicNumber: null,
    position: 1,
    textAr: TEXT,
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]', position: 1 },
    chapter: null,
    sourceUrl: null,
  };
}

function savedItem(hadithNumber: string, over: Partial<SavedHadithItem> = {}): SavedHadithItem {
  return {
    saved: { collectionSlug: 'bukhari', hadithNumber, bookNumber: '2', unverified: false, createdAt: 1 },
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]' },
    hadith: detail(hadithNumber),
    openNumber: hadithNumber,
    ...over,
  };
}

describe('HadithSavedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSavedHadithItems).mockReturnValue([]);
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSavedScreen />, { locale });
    expect(screen.getByTestId('screen-hadith-saved')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'المحفوظات' : 'Saved')).toBeOnTheScreen();
  });

  it('lists saved items newest first', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2'), savedItem('1')]);
    await renderUi(<HadithSavedScreen />);
    expect(screen.getByTestId('screen-hadith-saved-row-0')).toBeOnTheScreen();
    expect(screen.getByTestId('screen-hadith-saved-row-1')).toBeOnTheScreen();
  });

  it('a verified row opens the reader', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2')]);
    await renderUi(<HadithSavedScreen />);
    await press(screen.getByTestId('screen-hadith-saved-row-0'));
    expect(router.push).toHaveBeenCalledWith('/hadith/bukhari/hadith/2');
  });

  it('an unverified row opens its book', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([
      savedItem('2', { saved: { collectionSlug: 'bukhari', hadithNumber: '2', bookNumber: '2', unverified: true, createdAt: 1 }, openNumber: null }),
    ]);
    await renderUi(<HadithSavedScreen />);
    await press(screen.getByTestId('screen-hadith-saved-row-0'));
    expect(router.push).toHaveBeenCalledWith('/hadith/bukhari/books/7');
  });

  it('shows no notice when every item is verified', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2')]);
    await renderUi(<HadithSavedScreen />);
    expect(screen.queryByTestId('screen-hadith-saved-notice')).toBeNull();
  });

  it('shows the notice when an item is unverified', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([
      savedItem('2', { saved: { collectionSlug: 'bukhari', hadithNumber: '2', bookNumber: '2', unverified: true, createdAt: 1 }, openNumber: null }),
    ]);
    await renderUi(<HadithSavedScreen />);
    expect(screen.getByTestId('screen-hadith-saved-notice')).toBeOnTheScreen();
  });

  it('shows the empty state with a browse action', async () => {
    await renderUi(<HadithSavedScreen />);
    expect(screen.getByText('لا توجد أحاديث محفوظة بعد')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'تصفّح المجموعات' }));
    expect(router.replace).toHaveBeenCalledWith('/hadith');
  });

  it('shows an item whose collection was removed at book level without a preview', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2', { collection: null, book: null, hadith: null, openNumber: null })]);
    await renderUi(<HadithSavedScreen />);
    expect(screen.getByTestId('screen-hadith-saved-row-0')).toBeOnTheScreen();
    expect(screen.queryByText(TEXT)).toBeNull();
  });

  it('reads only the personal tables and the pack, never the network', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2')]);
    await renderUi(<HadithSavedScreen />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
