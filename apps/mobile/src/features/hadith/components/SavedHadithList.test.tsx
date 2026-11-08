import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { PLACEHOLDER_TEXT } from '../../../../jest/hadith-ui-fixtures';
import { useSavedHadithItems } from '../personal';
import type { SavedHadithItem } from '../personal/model';
import type { HadithDetail } from '../types';

import { SavedHadithList } from './SavedHadithList';

jest.mock('../personal', () => ({
  useSavedHadithItems: jest.fn(() => []),
}));

const TEST_ID = 'saved-list';

function detail(hadithNumber: string): HadithDetail {
  return {
    resourceId: -1,
    id: 1,
    bookId: 7,
    chapterId: null,
    hadithNumber,
    arabicNumber: null,
    position: 1,
    textAr: PLACEHOLDER_TEXT,
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]', position: 1 },
    chapter: null,
    sourceUrl: null,
  };
}

function savedItem(hadithNumber: string, unverified = false): SavedHadithItem {
  return {
    saved: { collectionSlug: 'bukhari', hadithNumber, bookNumber: '2', unverified, createdAt: 1 },
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]' },
    hadith: unverified ? null : detail(hadithNumber),
    openNumber: unverified ? null : hadithNumber,
  };
}

describe('SavedHadithList', () => {
  beforeEach(() => {
    jest.mocked(useSavedHadithItems).mockReturnValue([]);
  });

  it.each(locales)('shows the empty state with its action (%s)', async (locale) => {
    const onEmptyAction = jest.fn();
    await renderUi(<SavedHadithList onEmptyAction={onEmptyAction} onOpen={jest.fn()} testID={TEST_ID} />, { locale });

    expect(screen.getByTestId(`${TEST_ID}-empty`)).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: locale === 'ar' ? 'تصفّح المجموعات' : 'Browse collections' }));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
  });

  it('renders one button row per item, with no notice when all are verified', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2'), savedItem('1')]);
    await renderUi(<SavedHadithList onEmptyAction={jest.fn()} onOpen={jest.fn()} testID={TEST_ID} />);

    expect(screen.getByTestId(`${TEST_ID}-row-0`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-row-1`)).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByTestId(`${TEST_ID}-notice`)).toBeNull();
  });

  it('shows the notice when an item is unverified', async () => {
    jest.mocked(useSavedHadithItems).mockReturnValue([savedItem('2', true)]);
    await renderUi(<SavedHadithList onEmptyAction={jest.fn()} onOpen={jest.fn()} testID={TEST_ID} />);

    expect(screen.getByTestId(`${TEST_ID}-notice`)).toBeOnTheScreen();
  });

  it('pressing a row calls onOpen with that item', async () => {
    const onOpen = jest.fn();
    const item = savedItem('2');
    jest.mocked(useSavedHadithItems).mockReturnValue([item]);
    await renderUi(<SavedHadithList onEmptyAction={jest.fn()} onOpen={onOpen} testID={TEST_ID} />);

    await press(screen.getByTestId(`${TEST_ID}-row-0`));

    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/SavedHadithList.tsx')).toEqual([]);
  });
});
