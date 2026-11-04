export type NamesListMeta = {
  listSlug: string;
  titleAr: string;
  sourceLabelAr: string;
  attributionAr: string | null;
  attributionEn: string | null;
  editionReference: string | null;
  sourceVersion: string;
};

export type NameSummary = {
  nameSlug: string;
  position: number;
  nameAr: string;
  isFavourite: boolean;
};

export type NameReference = {
  verseKey: string;
  verseTextUthmani: string | null;
};

export type NameDetail = NameSummary & {
  list: NamesListMeta;
  references: NameReference[];
  sourceNote: string | null;
};
