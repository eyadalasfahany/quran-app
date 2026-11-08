import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { IconButton, Screen } from '@/shared/ui';

import { CollectionHeader } from '../components/CollectionHeader';
import { HadithBookList } from '../components/HadithBookList';
import { HadithBrowseFallback } from '../components/HadithBrowseFallback';
import { HadithHadithList } from '../components/HadithHadithList';
import { HadithListHeader } from '../components/HadithListHeader';
import { useBookHadith, useHadithBooks, useHadithCollection } from '../hooks';
import { useHadithBookmarks } from '../personal';
import { hadithHref } from '../routes';

const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
// No book has this id; the hooks return nothing for it, so a collection without a sole book reads nothing.
const NO_BOOK = -1;

/**
 * One collection. A multi-book collection lists its books; a single-book collection (soleBookId set) lists its hadith
 * directly. The decision is the soleBookId, never the slug.
 */
export function HadithCollectionPhoneScreen({ slug, testID = 'screen-hadith-collection' }: { slug: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const collection = useHadithCollection(slug);
  const books = useHadithBooks(slug);
  const soleBookId = collection?.soleBookId ?? null;
  const single = useBookHadith(slug, soleBookId ?? NO_BOOK);
  const bookmarks = useHadithBookmarks();
  const savedNumbers = useMemo(
    () => new Set(bookmarks.filter((bookmark) => bookmark.collectionSlug === slug).map((bookmark) => bookmark.hadithNumber)),
    [bookmarks, slug],
  );

  const back = () => goBackOr(hadithHref.home);
  const search = (
    <IconButton icon={SEARCH} label={t('hadith.list.search')} onPress={() => router.push(hadithHref.search)} testID={`${testID}-search`} variant="raised" />
  );

  let body: ReactElement;
  if (!ready) {
    body = <HadithBrowseFallback kind="loading" onBack={back} />;
  } else if (collection === undefined) {
    body = <HadithBrowseFallback kind="notFound" onBack={back} />;
  } else if (soleBookId !== null) {
    const header = (
      <View style={{ gap: theme.space[4], paddingTop: theme.space[2] }}>
        <HadithListHeader onBack={back} trailing={search} />
        <CollectionHeader
          booksCount={collection.booksCount}
          collection={collection}
          soleBook
          totalHadith={collection.totalHadith}
          variant="inline"
        />
      </View>
    );
    body = (
      <HadithHadithList
        bottomInset={theme.space[8]}
        hasMore={single.hasMore}
        header={header}
        items={single.items}
        onLoadMore={single.loadMore}
        onOpen={(item) => router.push(hadithHref.reader(slug, item.hadithNumber))}
        savedNumbers={savedNumbers}
      />
    );
  } else {
    const header = (
      <View style={{ gap: theme.space[4], paddingTop: theme.space[2] }}>
        <HadithListHeader onBack={back} trailing={search} />
        <CollectionHeader
          booksCount={collection.booksCount}
          collection={collection}
          soleBook={false}
          totalHadith={collection.totalHadith}
          variant="centered"
        />
      </View>
    );
    body = (
      <HadithBookList
        books={books}
        header={header}
        onOpen={(book) => router.push(hadithHref.book(slug, book.id))}
      />
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, gap: theme.space[4] }}>{body}</View>
      </ContentColumn>
    </Screen>
  );
}
