export { useAllHighlights, useAllNotes, useBookmarks, useHighlights, useHighlightsByVerseId, useNotes } from './hooks';
export {
  HighlightValidationError,
  NOTE_MAX_CHARACTERS,
  NoteValidationError,
  isBookmarkKind,
  isHighlightColor,
  noteCharacterCount,
  prepareNoteBody,
} from './model';
export type { Bookmark, BookmarkKind, Highlight, HighlightColor, Note } from './model';
export {
  deleteBookmark,
  deleteNote,
  ensureHighlight,
  getHighlights,
  getNotes,
  listBookmarks,
  listHighlights,
  listNotes,
  saveNote,
  setHighlight,
  toggleBookmark,
} from './repository';
export type { UserStore } from './repository';
