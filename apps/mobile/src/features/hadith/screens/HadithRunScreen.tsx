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
import { HadithHadithList } from '../components/HadithHadithList';
import { HadithListHeader } from '../components/HadithListHeader';
import { useBookOutline, useHadithBook, useHadithCollection, useRunHadith } from '../hooks';
import { useHadithBookmarks } from '../personal';
import { hadithHref } from '../routes';
import { bookTitle, collectionTitle, runTitle } from '../titles';

const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
const NO_ID = -1;

/**
 * One run of chapterless hadith in a partly chaptered book (ADR 0076, option B): the hadith between `from` and `to`
 * (entry positions, inclusive) in position order. The run's title comes from the book outline.
 */
export function HadithRunScreen({
  slug,
  bookId,
  from,
  to,
  testID = 'screen-hadith-run',
}: {
  slug: string;
  bookId: number | null;
  from: number | null;
  to: number | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const id = bookId ?? NO_ID;
  const book = useHadithBook(slug, id);
  const collection = useHadithCollection(slug);
  const outline = useBookOutline(slug, id);
  const run = outline.find(
    (item) => item.kind === 'run' && item.firstPosition === from && item.lastPosition === to,
  );
  const range = run?.kind === 'run' ? { from: run.firstPosition, to: run.lastPosition } : null;
  const paged = useRunHadith(slug, id, range);
  const bookmarks = useHadithBookmarks();
  const savedNumbers = useMemo(
    () => new Set(bookmarks.filter((bookmark) => bookmark.collectionSlug === slug).map((bookmark) => bookmark.hadithNumber)),
    [bookmarks, slug],
  );

  const back = () => goBackOr(hadithHref.book(slug, id));
  let body: ReactElement;
  if (!ready) {
    body = <HadithBrowseFallback kind="loading" onBack={back} />;
  } else if (bookId === null || book === undefined || collection === undefined || run === undefined || run.kind !== 'run') {
    body = <HadithBrowseFallback kind="notFound" onBack={back} />;
  } else {
    const header = (
      <View style={{ gap: theme.space[4], paddingTop: theme.space[2] }}>
        <HadithListHeader
          onBack={back}
          subtitle={`${bookTitle(book, locale, t)} · ${collectionTitle(collection, locale, t)}`}
          title={runTitle(run, locale, t)}
          trailing={
            <IconButton icon={SEARCH} label={t('hadith.list.search')} onPress={() => router.push(hadithHref.search)} testID={`${testID}-search`} variant="raised" />
          }
        />
      </View>
    );
    body = (
      <HadithHadithList
        bottomInset={theme.space[8]}
        hasMore={paged.hasMore}
        header={header}
        items={paged.items}
        onLoadMore={paged.loadMore}
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
