import type { HighlightColor } from '@/features/library/data/model';

import type { ChapterRecord } from './data/chapters';
import type { VerseRecord } from './data/verses';

export type TranslationResourceMeta = {
  resourceId: number;
  name: string;
  authorName: string | null;
  direction: 'rtl' | 'ltr';
};

export type VerseTranslationBlock = {
  resourceId: number;
  text: string;
  meta: TranslationResourceMeta;
};

export type ReadingRow =
  | {
      type: 'surah-header';
      key: string;
      chapter: ChapterRecord;
    }
  | {
      type: 'bismillah';
      key: string;
      text: string;
    }
  | {
      type: 'ayah';
      key: string;
      verse: VerseRecord;
      translations: VerseTranslationBlock[];
    };

export type ReadingListMode = 'reading' | 'focus';

export type AyahRowState = {
  selected: boolean;
  recited: boolean;
  highlightColor: HighlightColor | null;
};
