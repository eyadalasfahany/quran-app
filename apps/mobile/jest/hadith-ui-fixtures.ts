import { flatStyle } from './render-ui';
import type { HadithBook, HadithChapter, HadithCollection, HadithListItem, HadithSearchHit } from '@/features/hadith/types';

/**
 * Builders for hadith UI tests. Every text is a marked placeholder («نص تجريبي ... ليس حديثًا», `[...]`),
 * never a hadith, a book, a chapter, a collection or an author. No grade, narrator or real name appears here.
 */

export const PLACEHOLDER_TEXT = 'نص تجريبي ١ — ليس حديثًا';
export const PLACEHOLDER_TEXT_LONG = Array.from({ length: 8 }, () => PLACEHOLDER_TEXT).join(' ');
export const PLACEHOLDER_TEXT_MARKS = 'نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا';
export const PLACEHOLDER_CHAIN = '[سَنَدُ الحَدِيثِ: سِلْسِلَةُ الرُّوَاةِ]';

export function collectionFixture(over: Partial<HadithCollection> = {}): HadithCollection {
  return {
    resourceId: -1,
    id: 1,
    slug: 'bukhari',
    number: 1,
    titleAr: '[اسم المجموعة]',
    titleEn: '[Collection name]',
    authorAr: '[اسم المؤلف]',
    authorEn: '[Author name]',
    attributionAr: '[سطر النسبة من المصدر]',
    attributionEn: '[Attribution line]',
    sourceUrl: null,
    totalHadith: 5432,
    booksCount: 42,
    soleBookId: null,
    ...over,
  };
}

export function bookFixture(over: Partial<HadithBook> = {}): HadithBook {
  return {
    resourceId: -1,
    id: 1,
    collectionSlug: 'bukhari',
    bookNumber: '1',
    titleAr: '[اسم الكتاب]',
    titleEn: '[Book name]',
    position: 1,
    hadithCount: 123,
    chapterCount: 0,
    hasChapters: false,
    ...over,
  };
}

export function chapterFixture(over: Partial<HadithChapter> = {}): HadithChapter {
  return {
    resourceId: -1,
    id: 1,
    bookId: 1,
    chapterNumber: 1,
    titleAr: '[اسم الباب]',
    titleEn: null,
    position: 1,
    hadithCount: 24,
    soleHadithNumber: null,
    ...over,
  };
}

export function listItemFixture(over: Partial<HadithListItem> = {}): HadithListItem {
  return {
    resourceId: -1,
    id: 1,
    bookId: 1,
    chapterId: null,
    hadithNumber: '1234',
    arabicNumber: null,
    position: 1,
    textAr: PLACEHOLDER_TEXT,
    ...over,
  };
}

export function searchHitFixture(over: Partial<HadithSearchHit> = {}): HadithSearchHit {
  return {
    item: listItemFixture({ textAr: PLACEHOLDER_TEXT }),
    collection: {
      slug: 'bukhari',
      number: 1,
      titleAr: '[اسم المجموعة]',
      titleEn: '[Collection name]',
      attributionAr: '[سطر النسبة من المصدر]',
      attributionEn: '[Attribution line]',
    },
    bookNumber: '1',
    ranges: [{ start: 4, end: 9 }],
    ...over,
  };
}

export const PHYSICAL_SIDE_KEYS = ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'] as const;

/** The physical side keys present in a flattened style. Layout must use start and end instead. */
export function physicalSides(style: object): string[] {
  return Object.keys(style).filter((key) => (PHYSICAL_SIDE_KEYS as readonly string[]).includes(key));
}

/** The testIDs under the node with 'testID' in the rendered JSON, in tree order, each once. Proves the visual order of children. */
export function testIdsInOrder(root: unknown, testID: string): string[] {
  const ids: string[] = [];
  const walk = (node: unknown): boolean => {
    if (typeof node !== 'object' || node === null) {
      return false;
    }
    if (Array.isArray(node)) {
      return node.some(walk);
    }
    const json = node as { props?: { testID?: unknown }; children?: unknown };
    if (json.props?.testID === testID) {
      collect(json);
      return true;
    }
    return walk(json.children);
  };
  const collect = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    const json = node as { props?: { testID?: unknown }; children?: unknown };
    if (typeof json.props?.testID === 'string') {
      ids.push(json.props.testID);
    }
    collect(json.children);
  };
  walk(root);
  return Array.from(new Set(ids));
}

/** The text a hadith node draws, joined from its children (plain strings and nested spans), for byte-for-byte checks. */
export function joinedChildrenText(children: unknown): string {
  const list = Array.isArray(children) ? children : [children];
  return list
    .map((child) => (typeof child === 'string' ? child : (child as { props: { children: string } }).props.children))
    .join('');
}

/** The style of the nearest ancestor that sets `key`, for checking a wrapper the component builds around a header. */
export function ancestorStyle(element: { parent: unknown }, key: string): unknown {
  let node = element.parent as { props: { style?: unknown }; parent: unknown } | null | undefined;
  while (node) {
    const style = flatStyle(node.props.style) as Record<string, unknown>;
    if (style[key] !== undefined) return style[key];
    node = node.parent as typeof node;
  }
  return undefined;
}
