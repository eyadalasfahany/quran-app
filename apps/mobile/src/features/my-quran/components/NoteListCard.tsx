import { useTranslation } from 'react-i18next';

import { formatDate, formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { EmptyState, Icon, IconButton } from '@/shared/ui';

import type { SavedNoteItem } from '../data/saved-items';
import { SavedVerseRow } from './SavedVerseRow';
import { chapterDisplayName } from '@/features/reader/data/chapters';

const NOTE_ICON = { ios: 'note.text', android: 'edit_note' } as const;
const EDIT_ICON = { ios: 'pencil', android: 'edit' } as const;

/**
 * Every note (#MyQuran, الملاحظات): the «سورة · الآية» title over a two-line body preview.
 * Tapping opens the reader there; the trailing button opens the ayah's action sheet, where the
 * note editor lives (the same panel the reader's long-press shows).
 * With none, the tab draws the #EmptyMyQuran state.
 */
export function NoteListCard({
  items,
  onOpenVerse,
  onEditNote,
  onOpenMushaf,
  testID = 'note-list',
}: {
  items: readonly SavedNoteItem[];
  onOpenVerse: (verseKey: string) => void;
  onEditNote: (verseKey: string) => void;
  onOpenMushaf: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <EmptyState
        action={{ label: t('myQuran.empty.notes.action'), onPress: onOpenMushaf }}
        body={t('myQuran.empty.notes.body')}
        icon={NOTE_ICON}
        testID={`${testID}-empty`}
        title={t('myQuran.empty.notes.title')}
      />
    );
  }

  return (
    <>
      {items.map(({ row, verse, chapter }) => {
        const surah = chapter === undefined ? verse.verseKey : chapterDisplayName(chapter, locale);
        const title = t('myQuran.reference', { ayah: formatNumber(verse.verseNumber, locale), surah });

        return (
          <SavedVerseRow
            key={row.id}
            footnote={formatDate(row.clientUpdatedAt, locale)}
            leading={<Icon color={theme.colors.brand} name={NOTE_ICON} size={theme.size.icon} />}
            onPress={() => onOpenVerse(verse.verseKey)}
            subtitle={row.body}
            subtitleLines={2}
            testID={`${testID}-row-${row.id}`}
            title={title}
            trailing={
              <IconButton
                icon={EDIT_ICON}
                iconSize={theme.size.iconSm}
                label={t('myQuran.editNote')}
                onPress={() => onEditNote(verse.verseKey)}
                testID={`${testID}-edit-${row.id}`}
                tone="muted"
              />
            }
          />
        );
      })}
    </>
  );
}
