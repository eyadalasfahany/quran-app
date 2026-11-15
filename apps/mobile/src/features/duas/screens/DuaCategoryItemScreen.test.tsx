/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories cannot reference imports, so they require React here. */
import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import type { DuaCategory, DuaCategoryItem } from '../data/model';
import { DuaCategoryItemScreen } from './DuaCategoryItemScreen';

const mockedHooks = duasHooks as jest.Mocked<typeof duasHooks>;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useDuaCategories: jest.fn(),
  useDuaCategoryItems: jest.fn(),
  useDuaTopics: jest.fn(),
}));

// The three detail screens are stubbed: each echoes the props it is given, so the test checks the dispatch and the pager.
jest.mock('./DuaHadithDetailScreen', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return {
    DuaHadithDetailScreen: (props: { duaKey: string; pager: { position: number; total: number }; title: string }) =>
      createElement(Text, { testID: 'stub-hadith' }, `${props.duaKey}|${props.pager.position}|${props.pager.total}|${props.title}`),
  };
});
jest.mock('./DuaQuranDetailScreen', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return {
    DuaQuranDetailScreen: (props: { duaKey: string; pager: { position: number; total: number }; title: string }) =>
      createElement(Text, { testID: 'stub-quran' }, `${props.duaKey}|${props.pager.position}|${props.pager.total}|${props.title}`),
  };
});
jest.mock('./DuaHisnDetailScreen', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return {
    DuaHisnDetailScreen: (props: { entryKey: string; pager: { position: number; total: number }; title: string }) =>
      createElement(Text, { testID: 'stub-hisn' }, `${props.entryKey}|${props.pager.position}|${props.pager.total}|${props.title}`),
  };
});

// Fixture text only: no dua, verse or hadith is written here.
const HISN: DuaCategory = { id: 'hisn:morning', kind: 'hisn', titleKey: 'azkar.categories.morning', title: null, count: 3, sourceKind: 'azkar' };
const ITEMS: DuaCategoryItem[] = [
  { kind: 'hisn', entryKey: 'FIXTURE:entry-1', chapterTitle: null, preview: 'FIXTURE preview 1', quranRefs: [], bookNumber: '1' },
  { kind: 'hisn', entryKey: 'FIXTURE:entry-2', chapterTitle: null, preview: 'FIXTURE preview 2', quranRefs: [], bookNumber: '2' },
  { kind: 'hisn', entryKey: 'FIXTURE:entry-3', chapterTitle: null, preview: 'FIXTURE preview 3', quranRefs: [], bookNumber: '3' },
];
const HADITH_CATEGORY: DuaCategory = { id: 'hadeethenc:3', kind: 'hadeethenc', titleKey: null, title: 'FIXTURE group', count: 2, sourceKind: 'duas' };
const HADITH_ITEMS: DuaCategoryItem[] = [
  { kind: 'hadith', duaKey: 'hadeethenc:10', preview: 'FIXTURE preview h1' },
  { kind: 'hadith', duaKey: 'hadeethenc:11', preview: 'FIXTURE preview h2' },
];
const QURAN_CATEGORY: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 2, sourceKind: 'duas' };
const QURAN_ITEMS: DuaCategoryItem[] = [
  { kind: 'quran', duaKey: 'quran:1:1', quranReference: null, text: 'FIXTURE quran text 1' },
  { kind: 'quran', duaKey: 'quran:2:1', quranReference: null, text: 'FIXTURE quran text 2' },
];

function setup(category: DuaCategory | undefined, items: DuaCategoryItem[]) {
  mockedHooks.useDuaTopics.mockReturnValue([]);
  mockedHooks.useDuaCategories.mockReturnValue(category ? [category] : []);
  mockedHooks.useDuaCategoryItems.mockReturnValue(items);
}

describe('DuaCategoryItemScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Hisn detail for a Hisn item, paged within the category', async () => {
    setup(HISN, ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="hisn:morning" index={1} />);

    expect(screen.getByTestId('stub-hisn')).toHaveTextContent('FIXTURE:entry-2|2|3|أذكار الصباح');
  });

  it('opens the prophetic detail for a HadeethEnc item, with the group title', async () => {
    setup(HADITH_CATEGORY, HADITH_ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="hadeethenc:3" index={0} />);

    expect(screen.getByTestId('stub-hadith')).toHaveTextContent('hadeethenc:10|1|2|FIXTURE group');
  });

  it('opens the Quranic detail for a Quranic item', async () => {
    setup(QURAN_CATEGORY, QURAN_ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="quran" index={1} />);

    expect(screen.getByTestId('stub-quran')).toHaveTextContent('quran:2:1|2|2|من القرآن الكريم');
  });

  it('counts the category, not the whole list: the pager total is the category size', async () => {
    setup(QURAN_CATEGORY, QURAN_ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="quran" index={0} />);

    expect(screen.getByTestId('stub-quran')).toHaveTextContent('quran:1:1|1|2|من القرآن الكريم');
  });

  it('shows the reader shell, with no detail, for an index past the category', async () => {
    setup(HISN, ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="hisn:morning" index={9} />);

    expect(screen.queryByTestId('stub-hisn')).toBeNull();
    expect(screen.getByText('أذكار الصباح')).toBeOnTheScreen();
  });

  it('shows the reader shell for a negative index (a malformed route)', async () => {
    setup(HISN, ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="hisn:morning" index={-1} />);

    expect(screen.queryByTestId('stub-hisn')).toBeNull();
  });

  it('titles a topic page with the topic name, and pages it within the topic', async () => {
    mockedHooks.useDuaCategories.mockReturnValue([]);
    mockedHooks.useDuaTopics.mockReturnValue([{ id: 'prayer', count: 3 }]);
    mockedHooks.useDuaCategoryItems.mockReturnValue(ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="topic:prayer" index={2} />);

    expect(screen.getByTestId('stub-hisn')).toHaveTextContent('FIXTURE:entry-3|3|3|الصلاة');
  });

  it('titles the shell with the Duas title for an unknown category', async () => {
    setup(undefined, []);
    await renderUi(<DuaCategoryItemScreen categoryId="hisn:unknown" index={0} />);

    expect(screen.getByText('الأدعية')).toBeOnTheScreen();
  });

  it('English: the Hisn detail renders under the English interface', async () => {
    setup(HISN, ITEMS);
    await renderUi(<DuaCategoryItemScreen categoryId="hisn:morning" index={0} />, { locale: 'en' });

    expect(screen.getByTestId('stub-hisn')).toBeOnTheScreen();
  });
});
