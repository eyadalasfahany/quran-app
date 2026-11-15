export type QuranicDuaSummary = {
  duaKey: string;
  position: number;
  surah: number;
  verseFrom: number;
  verseTo: number | null;
};

export type QuranicDuaDetail = QuranicDuaSummary & {
  total: number;
};

export type PropheticDuaGroup = {
  id: number;
  title: string;
  position: number;
};

export type PropheticDuaSummary = {
  duaKey: string;
  position: number;
  groupId: number | null;
  title: string;
};

export type PropheticDuaDetail = PropheticDuaSummary & {
  hadeeth: string;
  attribution: string;
  grade: string | null;
  explanation: string | null;
  reference: string | null;
  /** Parsed from `dua_hadith.hints` (see `parseDuaHints`). Empty when the dua has none. */
  hints: readonly string[];
  sourceUrl: string;
  index: number;
  total: number;
};

export type PropheticDuaSection = {
  groupId: number | null;
  title: string | null;
  items: PropheticDuaSummary[];
};

/**
 * A Duas category (ADR 0091). Names come from sources only: Taybah writes no theme. `quran` and `hisn` take their
 * name from an i18n key; a HadeethEnc group carries its title as received.
 */
export type DuaCategoryKind = 'quran' | 'hadeethenc' | 'hisn';

/** The installed pack a category reads from: Hisn duas read the `azkar` pack, the rest the `duas` pack. */
export type DuaCategorySource = 'duas' | 'azkar';

export type DuaCategory = {
  /** `quran`, `hadeethenc:<groupId>` or `hisn:<topicId>`. Used in the route (`routes.ts`). */
  id: string;
  kind: DuaCategoryKind;
  /** The i18n key of the name, for `quran` and `hisn` (`azkar.categories.<topicId>`). Null for `hadeethenc`. */
  titleKey: string | null;
  /** The HadeethEnc group title as received. Null for `quran` and `hisn`. */
  title: string | null;
  /** The number of duas in the category. Always at least 1: an empty category is never listed. */
  count: number;
  sourceKind: DuaCategorySource;
};

/** A Hisn dua card: an Azkar entry shown in Duas. Opens the Azkar reader (ADR 0091 §3). */
export type HisnDuaItem = {
  kind: 'hisn';
  entryKey: string;
  chapterTitle: string | null;
  preview: string | null;
  quranRefs: { surah: number; verseFrom: number; verseTo: number }[];
  bookNumber: string;
};

/** A HadeethEnc dua card. Its title is the only text shown in the list. */
export type HadithDuaItem = {
  kind: 'hadith';
  duaKey: string;
  preview: string;
};

/** A Quranic dua card: its surah and verses, never the verse text. */
export type QuranDuaItem = {
  kind: 'quran';
  duaKey: string;
  quranReference: string | null;
};

export type DuaCategoryItem = HisnDuaItem | HadithDuaItem | QuranDuaItem;
