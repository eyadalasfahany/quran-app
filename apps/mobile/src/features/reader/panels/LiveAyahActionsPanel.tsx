import { useMemo, type ComponentProps } from 'react';

import { useBookmarks, useHighlights, useNotes } from '@/features/library/data';

import { AyahActionsPanel } from './AyahActionsPanel';

type LiveProps = Omit<ComponentProps<typeof AyahActionsPanel>, 'bookmarked' | 'highlight' | 'note' | 'store'>;

// Bookmark, highlight and note state come from user.db live queries, so a change made elsewhere shows here.
export function LiveAyahActionsPanel(props: LiveProps) {
  const { verseId } = props;
  const verseIds = useMemo(() => [verseId], [verseId]);
  const bookmarks = useBookmarks();
  const highlights = useHighlights(verseIds);
  const notes = useNotes(verseId);

  const bookmarked = bookmarks.data.some((bookmark) => bookmark.kind === 'verse' && bookmark.verseId === verseId);
  const highlight = highlights.data[0]?.color ?? null;
  const note = notes.data[0] ?? null;

  return <AyahActionsPanel {...props} bookmarked={bookmarked} highlight={highlight} note={note} />;
}
