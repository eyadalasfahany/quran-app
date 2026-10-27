export { useBookmarks, useHighlights, useNotes } from './hooks';
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
  deleteNote,
  getHighlights,
  getNotes,
  listBookmarks,
  saveNote,
  setHighlight,
  toggleBookmark,
} from './repository';
export type { UserStore } from './repository';
