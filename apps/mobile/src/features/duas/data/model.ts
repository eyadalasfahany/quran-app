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

export type PropheticDuaLink =
  | { kind: 'hisn'; entryKey: string }
  | { kind: 'collection'; collectionSlug: string; hadithNumber: string };

export type PropheticDuaDetail = PropheticDuaSummary & {
  hadeeth: string;
  attribution: string;
  grade: string | null;
  explanation: string | null;
  reference: string | null;
  hints: string | null;
  sourceUrl: string;
  index: number;
  total: number;
  links: PropheticDuaLink[];
};

export type PropheticDuaSection = {
  groupId: number | null;
  title: string | null;
  items: PropheticDuaSummary[];
};
