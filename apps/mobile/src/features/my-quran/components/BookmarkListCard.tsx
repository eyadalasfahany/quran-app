import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { deleteBookmark, type UserStore } from '@/features/library/data';
import { EmptyState, Icon, IconButton } from '@/shared/ui';

import type { SavedBookmarkItem } from '../data/saved-items';
import { SavedVerseRow } from './SavedVerseRow';
import { chapterDisplayName } from '@/features/reader/data/chapters';

const BOOKMARK_ICON = { ios: 'bookmark', android: 'bookmark' } as const;
const BOOKMARK_FILL_ICON = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;
const CLOSE_ICON = { ios: 'xmark', android: 'close' } as const;

/**
 * The one bookmark (ADR 0028): the ayah it sits on, with page and juz under it (#MyQuran).
 * Tapping opens the reader there; the trailing button removes it. With no bookmark the tab
 * draws the #EmptyMyQuran state.
 */
export function BookmarkListCard({
  item,
  onOpenVerse,
  onOpenMushaf,
  store,
  testID = 'bookmark-list',
}: {
  item: SavedBookmarkItem | null;
  onOpenVerse: (verseKey: string) => void;
  onOpenMushaf: () => void;
  store?: UserStore;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  if (item === null) {
    return (
      <EmptyState
        action={{ label: t('myQuran.empty.bookmarks.action'), onPress: onOpenMushaf }}
        body={t('myQuran.empty.bookmarks.body')}
        icon={BOOKMARK_ICON}
        testID={`${testID}-empty`}
        title={t('myQuran.empty.bookmarks.title')}
      />
    );
  }

  const { row, verse, chapter } = item;
  const surah = chapter === undefined ? verse.verseKey : chapterDisplayName(chapter, locale);
  const title = t('myQuran.reference', { ayah: formatNumber(verse.verseNumber, locale), surah });
  const subtitle = t('myQuran.place', { juz: formatNumber(verse.juz, locale), page: formatNumber(verse.page, locale) });

  const remove = () => {
    try {
      deleteBookmark(row.id, store);
    } catch {
      // The live query restores the stored state.
    }
  };

  return (
    <SavedVerseRow
      leading={<Icon color={theme.colors.brand} name={BOOKMARK_FILL_ICON} size={theme.size.icon} />}
      onPress={() => onOpenVerse(verse.verseKey)}
      subtitle={subtitle}
      testID={`${testID}-row`}
      title={title}
      trailing={
        <IconButton
          icon={CLOSE_ICON}
          iconSize={theme.size.iconSm}
          label={t('myQuran.removeBookmark')}
          onPress={remove}
          testID={`${testID}-remove`}
          tone="muted"
        />
      }
    />
  );
}
