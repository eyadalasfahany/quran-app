import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { IconButton, Screen } from '@/shared/ui';

import { countHadith } from '../counts';
import { hadithNumberText } from '../number-text';
import { useBookHadith, useBookOutline, useHadithBook, useHadithBooks, useHadithCollection, useHadithReader } from '../hooks';
import { useHadithBookmarks } from '../personal';
import { useHadithReaderActions } from '../reader-actions';
import { hadithHref } from '../routes';
import { bookTitle, collectionTitle } from '../titles';
import type { HadithListItem, HadithRef } from '../types';

import { CollectionHeader } from './CollectionHeader';
import { HadithBookList } from './HadithBookList';
import { HadithBrowseFallback } from './HadithBrowseFallback';
import { HadithChapterList } from './HadithChapterList';
import { HadithDetailsPanel } from './HadithDetailsPanel';
import { HadithHadithList } from './HadithHadithList';
import { HadithListHeader } from './HadithListHeader';
import { HadithPaneLayout } from './HadithPaneLayout';
import { HadithReaderContent } from './HadithReaderContent';

const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
const NO_BOOK = -1;
const NO_NUMBER = '';

type Selection = { bookId: number | null; number: string | null };

/**
 * The expanded-window browser (frames HadithCollExpanded, HadithCollExpandedReader): the books on the start side, the
 * book's hadith or the reader on the end side, and the details panel beside the reader. Taps change the panes in place;
 * nothing navigates. A single-book collection has no start pane.
 */
export function HadithExpandedBrowser({
  slug,
  initialBookId,
  initialNumber,
  testID = 'hadith-expanded-browser',
}: {
  slug: string;
  initialBookId: number | null;
  initialNumber: string | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const collection = useHadithCollection(slug);
  const books = useHadithBooks(slug);
  const [selection, setSelection] = useState<Selection>({ bookId: initialBookId, number: initialNumber });
  const reader = useHadithReader(slug, selection.number ?? NO_NUMBER);
  // The reader's book wins; without a hadith open, the chosen book; else the first book, or the sole book.
  const bookId = reader?.hadith.book.id ?? selection.bookId ?? collection?.soleBookId ?? books[0]?.id ?? null;
  const book = useHadithBook(slug, bookId ?? NO_BOOK);
  const outline = useBookOutline(slug, bookId ?? NO_BOOK);
  const hadith = useBookHadith(slug, bookId ?? NO_BOOK);
  const bookmarks = useHadithBookmarks();
  const savedNumbers = useMemo(
    () => new Set(bookmarks.filter((bookmark) => bookmark.collectionSlug === slug).map((bookmark) => bookmark.hadithNumber)),
    [bookmarks, slug],
  );
  const actions = useHadithReaderActions(slug, reader, selection.number ?? NO_NUMBER);

  const back = () => goBackOr(hadithHref.home);
  const closeReader = () => setSelection((current) => ({ ...current, number: null }));
  const move = (ref: HadithRef | null) => {
    if (ref !== null) {
      setSelection({ bookId: ref.bookId, number: ref.hadithNumber });
    }
  };
  const openHadith = (item: HadithListItem) => setSelection({ bookId: item.bookId, number: item.hadithNumber });

  const singleBook = collection !== undefined && collection.soleBookId !== null;
  const search = (
    <IconButton icon={SEARCH} label={t('hadith.list.search')} onPress={() => router.push(hadithHref.search)} testID={`${testID}-search`} variant="raised" />
  );

  let start: ReactElement | undefined;
  if (collection !== undefined && !singleBook) {
    start = (
      <View style={{ flex: 1, gap: theme.space[4] }}>
        <CollectionHeader booksCount={collection.booksCount} collection={collection} soleBook={false} totalHadith={collection.totalHadith} variant="inline" />
        <View accessibilityLabel={t('hadith.expanded.books')} accessibilityRole="list" style={{ flex: 1 }}>
          <HadithBookList
            books={books}
            compact
            onOpen={(opened) => setSelection({ bookId: opened.id, number: null })}
            selectedBookId={bookId ?? undefined}
            testID={`${testID}-books`}
          />
        </View>
      </View>
    );
  }

  let end: ReactElement;
  let side: ReactElement | undefined;
  if (!ready) {
    end = <HadithBrowseFallback kind="loading" onBack={back} />;
  } else if (collection === undefined) {
    end = <HadithBrowseFallback kind="notFound" onBack={back} />;
  } else if (reader !== undefined) {
    end = (
      <HadithReaderContent
        data={reader}
        onBack={closeReader}
        onCopy={actions.onCopy}
        onNext={() => move(reader.next)}
        onPrevious={() => move(reader.previous)}
        onShare={actions.onShare}
        onToggleSave={actions.onToggleSave}
        saved={actions.saved}
        showHeader={!singleBook}
        totalHadith={collection.totalHadith}
      />
    );
    side = (
      <HadithDetailsPanel
        bookTitle={bookTitle(reader.hadith.book, locale, t)}
        collectionTitle={collectionTitle(collection, locale, t)}
        hadithNumber={hadithNumberText(reader.hadith)}
        testID={`${testID}-details`}
      />
    );
  } else if (book !== undefined) {
    const collectionName = collectionTitle(collection, locale, t);
    const subtitle = book.hasChapters ? collectionName : `${collectionName} · ${countHadith(book.hadithCount, locale, t)}`;
    const header = (
      <HadithListHeader onBack={back} subtitle={subtitle} title={bookTitle(book, locale, t)} titleSize="md" trailing={search} />
    );
    end = book.hasChapters ? (
      <HadithChapterList
        header={header}
        items={outline}
        onOpenChapter={(chapter) => router.push(hadithHref.chapter(slug, book.id, chapter.id))}
        onOpenRun={(run) => router.push(hadithHref.run(slug, book.id, run.firstPosition, run.lastPosition))}
        testID={`${testID}-chapters`}
      />
    ) : (
      <HadithHadithList
        bottomInset={theme.space[8]}
        hasMore={hadith.hasMore}
        header={header}
        items={hadith.items}
        onLoadMore={hadith.loadMore}
        onOpen={openHadith}
        savedNumbers={savedNumbers}
        testID={`${testID}-hadith`}
      />
    );
  } else {
    end = <HadithBrowseFallback kind="notFound" onBack={back} />;
  }

  return (
    <Screen testID={testID}>
      <View style={{ flex: 1, paddingHorizontal: theme.space[6], paddingTop: theme.space[2] }}>
        <HadithPaneLayout end={<View style={{ flex: 1 }}>{end}</View>} side={side} start={start} testID={`${testID}-panes`} />
      </View>
    </Screen>
  );
}
