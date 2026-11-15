import type { TFunction } from 'i18next';

import { i18n, type Locale } from '@/core/i18n';

import { duaCategoryHeading, duaHomeTiles } from './home-tiles';
import type { DuaCategory } from './model';
import type { DuaTopic } from './topics';

async function tFor(locale: Locale): Promise<TFunction> {
  await i18n.changeLanguage(locale);
  return i18n.getFixedT(locale);
}

// Fixture names only: no dua text is written here.
const QURAN: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 28, sourceKind: 'duas' };
const BOOK_48: DuaCategory = {
  id: 'hadithbook:muslim:48',
  kind: 'hadithbook',
  titleKey: null,
  title: 'FIXTURE book title',
  count: 3,
  sourceKind: 'hadith',
  bookNumber: '48',
  titleEn: 'FIXTURE book title en',
};
const GROUP: DuaCategory = { id: 'hadeethenc:7', kind: 'hadeethenc', titleKey: null, title: 'FIXTURE group title', count: 5, sourceKind: 'duas' };
const HISN_ONLY: DuaCategory = { id: 'hisn:morning', kind: 'hisn', titleKey: 'azkar.categories.morning', title: null, count: 9, sourceKind: 'azkar' };

const PRAYER: DuaTopic = { id: 'prayer', count: 4 };
const MORNING: DuaTopic = { id: 'morning-topic', count: 2 };

describe('duaHomeTiles', () => {
  it('lists the Quranic duas, then the hadith books, the HadeethEnc groups, then the topics', async () => {
    const t = await tFor('ar');
    const tiles = duaHomeTiles([GROUP, BOOK_48, QURAN], [PRAYER, MORNING], t, 'ar');

    expect(tiles.map((tile) => tile.id)).toEqual(['quran', 'hadithbook:muslim:48', 'hadeethenc:7', 'topic:prayer', 'topic:morning-topic']);
  });

  it('names each tile from its source, and carries its count', async () => {
    const t = await tFor('ar');
    const tiles = duaHomeTiles([QURAN, BOOK_48, GROUP], [PRAYER], t, 'ar');

    expect(tiles).toEqual([
      { id: 'quran', name: 'من القرآن الكريم', count: 28 },
      { id: 'hadithbook:muslim:48', name: 'FIXTURE book title', count: 3 },
      { id: 'hadeethenc:7', name: 'FIXTURE group title', count: 5 },
      { id: 'topic:prayer', name: 'الصلاة', count: 4 },
    ]);
  });

  it('names a hadith book in English from its English title', async () => {
    const t = await tFor('en');
    const tiles = duaHomeTiles([BOOK_48], [], t, 'en');

    expect(tiles[0]?.name).toBe('FIXTURE book title en');
  });

  it('never lists a Hisn-only category: its duas are in the topics', async () => {
    const t = await tFor('ar');
    const tiles = duaHomeTiles([HISN_ONLY, QURAN], [], t, 'ar');

    expect(tiles.map((tile) => tile.id)).toEqual(['quran']);
  });

  it('returns no tiles for an empty catalogue', async () => {
    const t = await tFor('ar');
    expect(duaHomeTiles([], [], t, 'ar')).toEqual([]);
  });
});

describe('duaCategoryHeading', () => {
  it('reads a topic page from the topic list: its name and count', async () => {
    const t = await tFor('ar');
    expect(duaCategoryHeading('topic:prayer', [], [PRAYER], t, 'ar')).toEqual({ title: 'الصلاة', count: 4 });
  });

  it('returns undefined for a topic that is not listed', async () => {
    const t = await tFor('ar');
    expect(duaCategoryHeading('topic:unknown', [QURAN], [PRAYER], t, 'ar')).toBeUndefined();
  });

  it('reads a category page from the category list: its name and count', async () => {
    const t = await tFor('ar');
    expect(duaCategoryHeading('quran', [QURAN], [], t, 'ar')).toEqual({ title: 'من القرآن الكريم', count: 28 });
    expect(duaCategoryHeading('hadeethenc:7', [GROUP], [], t, 'ar')).toEqual({ title: 'FIXTURE group title', count: 5 });
  });

  it('reads a Hisn category by its route id, as the Azkar topic name', async () => {
    const t = await tFor('ar');
    expect(duaCategoryHeading('hisn:morning', [HISN_ONLY], [], t, 'ar')).toEqual({ title: 'أذكار الصباح', count: 9 });
  });

  it('returns undefined for an id no category has', async () => {
    const t = await tFor('ar');
    expect(duaCategoryHeading('hisn:unknown', [QURAN], [], t, 'ar')).toBeUndefined();
    expect(duaCategoryHeading('not-a-route', [], [], t, 'ar')).toBeUndefined();
  });
});
