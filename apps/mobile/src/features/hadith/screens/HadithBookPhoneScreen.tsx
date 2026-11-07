import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { IconButton, Screen } from '@/shared/ui';

import { HadithBrowseFallback } from '../components/HadithBrowseFallback';
import { HadithChapterList } from '../components/HadithChapterList';
import { HadithHadithList } from '../components/HadithHadithList';
import { HadithListHeader } from '../components/HadithListHeader';
import { countHadith } from '../counts';
import { useBookHadith, useBookOutline, useHadithBook, useHadithCollection } from '../hooks';
import { useHadithBookmarks } from '../personal';
import { hadithHref } from '../routes';
import { bookTitle, collectionTitle } from '../titles';

const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
// No book has this id: the hooks read nothing for it while the route id is unknown.
const NO_BOOK = -1;

/**
 * One book (phone and medium windows). A chaptered book lists its outline (chapters and runs of chapterless hadith, ADR 0076 option B); a flat book lists its hadith. The subtitle
 * of a chaptered book is the collection title only, as in frame HadithCollChapters.
 */
export function HadithBookPhoneScreen({
  slug,
  bookId,
  testID = 'screen-hadith-book',
}: {
  slug: string;
  bookId: number | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const id = bookId ?? NO_BOOK;
  const book = useHadithBook(slug, id);
  const collection = useHadithCollection(slug);
  const outline = useBookOutline(slug, id);
  const hadith = useBookHadith(slug, id);
  const bookmarks = useHadithBookmarks();
  const savedNumbers = useMemo(
    () => new Set(bookmarks.filter((bookmark) => bookmark.collectionSlug === slug).map((bookmark) => bookmark.hadithNumber)),
    [bookmarks, slug],
  );

  const back = () => goBackOr(hadithHref.collection(slug));
  const search = (
    <IconButton icon={SEARCH} label={t('hadith.list.search')} onPress={() => router.push(hadithHref.search)} testID={`${testID}-search`} variant="raised" />
  );

  let body: ReactElement;
  if (!ready) {
    body = <HadithBrowseFallback kind="loading" onBack={back} />;
  } else if (bookId === null || book === undefined || collection === undefined) {
    body = <HadithBrowseFallback kind="notFound" onBack={back} />;
  } else {
    const collectionName = collectionTitle(collection, locale, t);
    const subtitle = book.hasChapters ? collectionName : `${collectionName} · ${countHadith(book.hadithCount, locale, t)}`;
    const header = (
      <View style={{ gap: theme.space[4], paddingTop: theme.space[2] }}>
        <HadithListHeader onBack={back} subtitle={subtitle} title={bookTitle(book, locale, t)} titleSize="md" trailing={search} />
      </View>
    );
    body = book.hasChapters ? (
      <HadithChapterList
        header={header}
        items={outline}
        onOpenChapter={(chapter) => router.push(hadithHref.chapter(slug, book.id, chapter.id))}
        onOpenRun={(run) => router.push(hadithHref.run(slug, book.id, run.firstPosition, run.lastPosition))}
      />
    ) : (
      <HadithHadithList
        bottomInset={theme.space[8]}
        hasMore={hadith.hasMore}
        header={header}
        items={hadith.items}
        onLoadMore={hadith.loadMore}
        onOpen={(item) => router.push(hadithHref.reader(slug, item.hadithNumber))}
        savedNumbers={savedNumbers}
      />
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[4] }}>{body}</View>
      </ContentColumn>
    </Screen>
  );
}
