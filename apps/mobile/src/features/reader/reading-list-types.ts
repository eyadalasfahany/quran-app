import type { HighlightColor } from '@/features/library/data/model';

import type { ChapterRecord } from './data/chapters';
import type { VerseRecord } from './data/verses';

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
    };

export type ReadingListMode = 'reading' | 'focus';

export type AyahRowState = {
  selected: boolean;
  recited: boolean;
  highlightColor: HighlightColor | null;
};
