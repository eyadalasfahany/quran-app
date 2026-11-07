import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Share } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';

import { hadithNumberText } from './number-text';
import { hadithCreditKey, isUnavailableHadith } from './source-credit';
import { saveHadithReadingPlace, toggleHadithBookmark, useIsHadithBookmarked } from './personal';
import { buildHadithShareText } from './share-text';
import { bookTitle, collectionTitle } from './titles';
import type { HadithReaderData } from './types';

export type HadithReaderActions = {
  saved: boolean;
  onToggleSave: () => void;
  onCopy: () => void;
  onShare: () => void;
};

/**
 * The reader's actions for one hadith: the bookmark (a synchronous user.db write), copy and share (the text with its
 * meta line and credit), and the last-read place saved each time a hadith opens. Nothing here touches the network.
 * `data` is undefined while the hadith is not known; `fallbackNumber` is the number asked for.
 */
export function useHadithReaderActions(
  slug: string,
  data: HadithReaderData | undefined,
  fallbackNumber: string,
): HadithReaderActions {
  const { t } = useTranslation();
  const locale = useLocale();
  const current = data?.hadith;
  const currentNumber = current?.hadithNumber;
  const currentBook = current?.book.bookNumber;
  const saved = useIsHadithBookmarked(slug, currentNumber ?? fallbackNumber);

  // The last-read place is saved each time a hadith opens. Nothing displays it yet (Open question 12).
  useEffect(() => {
    if (currentNumber === undefined || currentBook === undefined) {
      return;
    }
    try {
      saveHadithReadingPlace({ slug, hadithNumber: currentNumber, bookNumber: currentBook });
    } catch {
      // The reading place is a convenience; a failed write must not stop the reader.
    }
  }, [slug, currentNumber, currentBook]);

  const onToggleSave = () => {
    if (current === undefined) {
      return;
    }
    try {
      toggleHadithBookmark({ slug, hadithNumber: current.hadithNumber, bookNumber: current.book.bookNumber });
    } catch {
      // The live query keeps the stored state; nothing changes on screen.
    }
  };

  const shareMessage = (): string | null => {
    // A placeholder has no text to copy or share (ADR 0076).
    if (current === undefined || isUnavailableHadith(current.sourceCode)) {
      return null;
    }
    return buildHadithShareText({
      textAr: current.textAr,
      collectionTitle: collectionTitle(current.collection, locale, t),
      bookTitle: bookTitle(current.book, locale, t),
      numberText: hadithNumberText(current),
      creditLine: t(hadithCreditKey(current.sourceCode)),
      attribution: current.collection.attributionAr || null,
    });
  };

  const copy = async () => {
    const message = shareMessage();
    if (message === null) {
      return;
    }
    try {
      // A static import crashes the dev client that predates the clipboard module; require loads it when Copy is pressed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const clipboard = require('expo-clipboard') as { setStringAsync: (value: string) => Promise<boolean> };
      await clipboard.setStringAsync(message);
    } catch {
      return;
    }
    AccessibilityInfo.announceForAccessibility(t('hadith.reader.copied'));
  };

  const onShare = () => {
    const message = shareMessage();
    if (message !== null) {
      void Share.share({ message });
    }
  };

  return {
    saved,
    onToggleSave,
    onCopy: () => {
      void copy();
    },
    onShare,
  };
}
