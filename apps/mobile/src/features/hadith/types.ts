/** One installed hadith collection (a row of `hadith_collections`, one per pack). */
export type HadithCollection = {
  resourceId: number;
  id: number;
  /** Canonical slug: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi40`, `qudsi40`, `shahwaliullah40`. */
  slug: string;
  /** Fixed 1-based position of the slug in `HADITH_COLLECTION_SLUGS`; the n in «مجموعة {n}». Unknown slugs get 11, 12, ... in resource-id order. */
  number: number;
  /** Null until the developer supplies the name. Never replaced here. */
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  authorEn: string | null;
  attributionAr: string;
  attributionEn: string;
  sourceUrl: string | null;
  totalHadith: number;
  booksCount: number;
  /** The id of the only book that holds hadith, else null. Non-null means the UI opens the hadith list directly (nawawi40, qudsi40, shahwaliullah40). */
  soleBookId: number | null;
};

/** The few collection fields a hadith, a search hit or a breadcrumb needs. */
export type HadithCollectionRef = Pick<
  HadithCollection,
  'slug' | 'number' | 'titleAr' | 'titleEn' | 'attributionAr' | 'attributionEn'
>;

export type HadithBook = {
  resourceId: number;
  id: number;
  collectionSlug: string;
  /** Text. The n in «كتاب {n}». */
  bookNumber: string;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
  /** Number of chapter rows of this book (0 for fawazahmed0). */
  chapterCount: number;
  /** `chapterCount > 0`. A book is either chaptered or flat (plan D14, option C). */
  hasChapters: boolean;
};

export type HadithChapter = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterNumber: number;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
};

/** A hadith as a list row. `textAr` is the stored text, byte for byte. The UI clamps lines; this layer never shortens it. */
export type HadithListItem = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterId: number | null;
  /** Text, for example `'3.1'`. */
  hadithNumber: string;
  arabicNumber: string | null;
  position: number;
  textAr: string;
  /** Merged rows only (ADR 0076): the span of hadith numbers this row covers. Null for a normal row. */
  numberFirst?: string | null;
  numberLast?: string | null;
  /** Per-row origin: null or `fawazahmed0` for the collection's source; `openiti` and `hadithapicom` for filled text. */
  sourceCode?: string | null;
};

/** Where previous / next points. The route needs only the slug and `hadithNumber`. */
export type HadithRef = {
  hadithNumber: string;
  bookId: number;
  chapterId: number | null;
};

/** One hadith for the reader, with its breadcrumb and source credit. No grade, no English. */
export type HadithDetail = HadithListItem & {
  collection: HadithCollectionRef;
  book: Pick<HadithBook, 'id' | 'bookNumber' | 'titleAr' | 'titleEn' | 'position'>;
  chapter: Pick<HadithChapter, 'id' | 'chapterNumber' | 'titleAr' | 'titleEn'> | null;
  /** Null for fawazahmed0: the UI shows no link. */
  sourceUrl: string | null;
};

export type HadithReaderData = {
  hadith: HadithDetail;
  /** The hadith before this one in book order, across book (and chapter) boundaries; null at the start of the collection. */
  previous: HadithRef | null;
  next: HadithRef | null;
};

/** One row of the collections list, installed or not. */
export type HadithCatalogEntry = {
  resourceId: number;
  /** From `catalog_resources`. */
  name: string | null;
  nameAr: string | null;
  version: number;
  packSizeBytes: number;
  installed: boolean;
  /** Known only when installed (read from `hadith_collections`); null before install (Open question 1). */
  slug: string | null;
};

/** A highlighted span in `textAr`: UTF-16 offsets into the stored text, `end` exclusive. */
export type HadithTextRange = { start: number; end: number };

export type HadithSearchHit = {
  item: HadithListItem;
  collection: HadithCollectionRef;
  bookNumber: string;
  /** Sorted, non-overlapping, on the original `textAr`. */
  ranges: HadithTextRange[];
};

export type HadithSearchPage = { hits: HadithSearchHit[]; hasMore: boolean };
