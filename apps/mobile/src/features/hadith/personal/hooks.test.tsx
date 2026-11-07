import { renderHook } from '@testing-library/react-native';

import { FIXTURE_MULTI } from '../data/__fixtures__/dev-fixtures';
import { canonicalHadithNumber } from './covering-number';
import { addHadithBookmark } from './bookmarks-repository';
import { fixedNow, openPersonalDbs, type PersonalDbs } from './__fixtures__/personal-test-db';
import {
  useHadithBookmarks,
  useHadithReadingPlace,
  useIsHadithBookmarked,
  useSavedHadithItems,
} from './hooks';
import { liveIsHadithBookmarkedQuery } from './live-queries';

const mockUseLiveQuery = jest.fn();
jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: (...args: unknown[]) => mockUseLiveQuery(...args),
}));

jest.mock('./live-queries', () => ({
  liveHadithBookmarksQuery: jest.fn(() => 'bookmarks-query'),
  liveIsHadithBookmarkedQuery: jest.fn(() => 'is-bookmarked-query'),
  liveHadithReadingPlaceQuery: jest.fn(() => 'place-query'),
}));

jest.mock('./covering-number', () => ({
  canonicalHadithNumber: jest.fn((_content: unknown, _slug: string, hadithNumber: string) => hadithNumber),
  resolveCoveringNumber: () => null,
}));

let mockPersonalDbs: PersonalDbs;
const mockContentOpen = jest.fn();

jest.mock('@/core/db/user/open', () => ({
  openUserDb: () => ({ db: {}, executor: mockPersonalDbs.user }),
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockContentOpen(),
}));

const slug = FIXTURE_MULTI.slug;

describe('hadith personal hooks', () => {
  beforeEach(() => {
    mockPersonalDbs = openPersonalDbs();
    mockUseLiveQuery.mockReturnValue({ data: [] });
    mockContentOpen.mockImplementation(() => ({ db: {}, executor: mockPersonalDbs.content }));
    jest.mocked(canonicalHadithNumber).mockImplementation((_content, _slug, hadithNumber) => hadithNumber);
    jest.mocked(liveIsHadithBookmarkedQuery).mockClear();
  });

  afterEach(() => {
    mockPersonalDbs.close();
  });

  it('useIsHadithBookmarked is false when the live query returns nothing', async () => {
    const { result } = await renderHook(() => useIsHadithBookmarked(slug, '1'));
    expect(result.current).toBe(false);
  });

  it('useIsHadithBookmarked is true when the live query returns a row', async () => {
    mockUseLiveQuery.mockReturnValue({ data: [{ hadithNumber: '1' }] });

    const { result } = await renderHook(() => useIsHadithBookmarked(slug, '1'));
    expect(result.current).toBe(true);
  });

  it('useIsHadithBookmarked asks for the covering number and the given number', async () => {
    jest.mocked(canonicalHadithNumber).mockImplementation(() => '5709');

    await renderHook(() => useIsHadithBookmarked(slug, '5710'));

    expect(liveIsHadithBookmarkedQuery).toHaveBeenCalledWith(expect.anything(), slug, ['5709', '5710']);
  });

  it('useHadithBookmarks maps unverified to a boolean', async () => {
    mockUseLiveQuery.mockReturnValue({
      data: [
        { collectionSlug: slug, hadithNumber: '1', bookNumber: '1', unverified: 1, aliasVersion: 0, createdAt: 5 },
        { collectionSlug: slug, hadithNumber: '2', bookNumber: '1', unverified: 0, aliasVersion: 0, createdAt: 6 },
      ],
    });

    const { result } = await renderHook(() => useHadithBookmarks());

    expect(result.current).toEqual([
      { collectionSlug: slug, hadithNumber: '1', bookNumber: '1', unverified: true, createdAt: 5 },
      { collectionSlug: slug, hadithNumber: '2', bookNumber: '1', unverified: false, createdAt: 6 },
    ]);
  });

  it('useSavedHadithItems joins the live rows with the pack', async () => {
    addHadithBookmark(
      { slug, hadithNumber: '1', bookNumber: '1' },
      { db: mockPersonalDbs.user, content: mockPersonalDbs.content, now: fixedNow(1) },
    );
    mockUseLiveQuery.mockReturnValue({ data: [{ hadithNumber: '1' }] });

    const { result } = await renderHook(() => useSavedHadithItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.hadith?.hadithNumber).toBe('1');
    expect(result.current[0]?.collection).toMatchObject({ slug });
  });

  it('useSavedHadithItems returns the stable empty list when the content database cannot be opened', async () => {
    mockContentOpen.mockImplementation(() => {
      throw new Error('content.db is not open in this test');
    });
    mockUseLiveQuery.mockReturnValue({ data: [] });

    const { result, rerender } = await renderHook(() => useSavedHadithItems());
    const first = result.current;
    await rerender({});

    expect(first).toEqual([]);
    expect(result.current).toBe(first);
  });

  it('useHadithReadingPlace returns undefined, then the live row', async () => {
    mockUseLiveQuery.mockReturnValueOnce({ data: [] });
    const { result, rerender } = await renderHook(() => useHadithReadingPlace(slug));
    expect(result.current).toBeUndefined();

    mockUseLiveQuery.mockReturnValueOnce({
      data: [{ collectionSlug: slug, hadithNumber: '1', bookNumber: '1', unverified: 0, updatedAt: 9 }],
    });
    await rerender({});

    expect(result.current).toEqual({ collectionSlug: slug, hadithNumber: '1', bookNumber: '1', unverified: false, updatedAt: 9 });
  });
});
