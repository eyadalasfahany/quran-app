import {
  azkarCategoryKinds,
  azkarEntryTypes,
  azkarItemKinds,
  azkarNoteKinds,
  azkarOccasions,
  azkarProgressPeriods,
  azkarReviewStatuses,
  azkarSegmentKinds,
  azkarTimingPrayers,
  azkarTimingTypes,
} from '@/core/db/content/schema';

export type AzkarCategoryKind = (typeof azkarCategoryKinds)[number];
export type AzkarEntryType = (typeof azkarEntryTypes)[number];
export type AzkarItemKind = (typeof azkarItemKinds)[number];
export type AzkarSegmentKind = (typeof azkarSegmentKinds)[number];
export type AzkarNoteKind = (typeof azkarNoteKinds)[number];
export type AzkarReviewStatus = (typeof azkarReviewStatuses)[number];
export type AzkarOccasion = (typeof azkarOccasions)[number];
export type AzkarTimingType = (typeof azkarTimingTypes)[number];
export type AzkarTimingPrayer = (typeof azkarTimingPrayers)[number];
export type AzkarProgressPeriod = (typeof azkarProgressPeriods)[number];

/** Narrows a stored text value to one of the allowed codes. Unknown values throw, like `verses.ts`. */
export function asAzkarEnum<const T extends readonly string[]>(values: T, value: string, field: string): T[number] {
  if ((values as readonly string[]).includes(value)) {
    return value as T[number];
  }
  throw new Error(`Unknown azkar ${field} "${value}".`);
}

export type AzkarChapter = {
  resourceId: number;
  id: number;
  sourceChapterId: string;
  number: number;
  titleAr: string | null;
  titleEn: string | null;
};

export type AzkarEntry = {
  resourceId: number;
  id: number;
  entryKey: string;
  chapterId: number;
  position: number;
  sourceReference: string;
  entryType: AzkarEntryType;
  occasion: AzkarOccasion | null;
  timingType: AzkarTimingType | null;
  timingPrayer: AzkarTimingPrayer | null;
  reviewStatus: AzkarReviewStatus;
  sourceVersion: string;
  importedAt: number;
};

export type AzkarItem = {
  resourceId: number;
  id: number;
  entryId: number;
  itemKey: string;
  variationKey: string;
  position: number;
  kind: AzkarItemKind;
  /** Sourced repetition count, or null when no source states one. Never defaulted to 1. */
  requiredCount: number | null;
  speaker: string | null;
  sourceDuaId: string | null;
  textEn: string | null;
  transliteration: string | null;
  repeatGroup: number | null;
  repeatTimes: number | null;
};

export type AzkarSegment = {
  resourceId: number;
  itemId: number;
  position: number;
  kind: AzkarSegmentKind;
  textAr: string | null;
  quranSurah: number | null;
  quranVerseFrom: number | null;
  quranVerseTo: number | null;
  textSearch: string | null;
};

export type AzkarItemDetail = AzkarItem & { segments: AzkarSegment[] };

export type AzkarCategory = {
  resourceId: number;
  id: string;
  kind: AzkarCategoryKind;
  position: number;
  occasion: AzkarOccasion | null;
  progressPeriod: AzkarProgressPeriod;
};

export type AzkarCategoryListItem = AzkarCategory & {
  /** Reader units in the category (see `reader-units.ts`), built for the requested locale. */
  unitCount: number;
};

/**
 * One alternative wording of an entry (upstream variation). Alternatives are mutually exclusive: the reader shows one
 * at a time. `labelEn` is null: upstream variation labels are not stored, and none is invented.
 */
export type AzkarVariation = {
  key: string;
  labelIndex: number;
  labelEn: string | null;
};

export type AzkarCategoryEntry = {
  entry: AzkarEntry;
  chapterNumber: number;
  /** The link's variation key (`'*'` keeps the entry's alternatives, one of which is active). */
  variationKey: string;
  /** Alternatives to switch between. Empty when the link fixes one variation. */
  variations: AzkarVariation[];
  activeVariation: string;
  /** The items of `activeVariation` only. */
  items: AzkarItemDetail[];
};

export type AzkarNote = {
  resourceId: number;
  id: number;
  entryId: number;
  itemId: number | null;
  kind: AzkarNoteKind;
  textAr: string | null;
  textEn: string | null;
  grader: string | null;
  sourceType: string;
  sourceName: string;
  sourceReference: string | null;
  sourceUrl: string | null;
  reviewStatus: AzkarReviewStatus;
};

export type AzkarRecording = {
  resourceId: number;
  id: number;
  recordingKey: string;
  itemId: number;
  reciterName: string;
  reciterNameAr: string | null;
  source: string;
  remoteUrl: string;
  durationMs: number;
  sizeBytes: number | null;
  streamAllowed: boolean;
  downloadAllowed: boolean;
  redistributionAllowed: boolean;
  attributionAr: string | null;
  attributionEn: string | null;
  licence: string;
  licenceUrl: string | null;
  rightsVerifiedAt: number | null;
};

export type AzkarEntryDetail = {
  entry: AzkarEntry;
  chapter: AzkarChapter | null;
  /** Every alternative of the entry, in upstream order (lowest item id first). */
  variations: AzkarVariation[];
  activeVariation: string;
  /** The items of `activeVariation`, in position order. */
  items: AzkarItemDetail[];
  /** Every note kind is present, empty when the entry has none of that kind. */
  notes: Record<AzkarNoteKind, AzkarNote[]>;
  recordings: AzkarRecording[];
};

export type AzkarProgressRow = {
  scopeKey: string;
  periodKey: string;
  itemKey: string;
  currentCount: number;
  completedAt: number | null;
  updatedAt: number;
};

export type AzkarFavorite = {
  entryKey: string;
  createdAt: number;
};
