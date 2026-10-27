import { highlightColors, NOTE_MAX_CHARACTERS } from '@/core/db/user/schema';

export { NOTE_MAX_CHARACTERS };

export type BookmarkKind = 'verse' | 'page';

export type HighlightColor = (typeof highlightColors)[number];

export type Bookmark = {
  id: string;
  verseId: number;
  kind: BookmarkKind;
  page: number | null;
  clientUpdatedAt: number;
};

export type Highlight = {
  id: string;
  verseId: number;
  color: HighlightColor;
  clientUpdatedAt: number;
};

export type Note = {
  id: string;
  verseId: number;
  body: string;
  clientUpdatedAt: number;
};

export class NoteValidationError extends Error {
  readonly code: 'note_empty' | 'note_too_long';

  constructor(code: 'note_empty' | 'note_too_long') {
    super(code);
    this.name = 'NoteValidationError';
    this.code = code;
  }
}

export class HighlightValidationError extends Error {
  readonly code = 'highlight_color_invalid' as const;

  constructor() {
    super('highlight_color_invalid');
    this.name = 'HighlightValidationError';
  }
}

const highlightColorSet: ReadonlySet<string> = new Set(highlightColors);

export function isHighlightColor(value: string): value is HighlightColor {
  return highlightColorSet.has(value);
}

export function isBookmarkKind(value: string): value is BookmarkKind {
  return value === 'verse' || value === 'page';
}

/** Code points, matching SQLite `length()` and the 10,000-character check. */
export function noteCharacterCount(body: string): number {
  return Array.from(body).length;
}

/**
 * Removes whitespace a text field adds at the ends.
 * Characters inside the body, including Quran text the reader pasted, stay byte for byte.
 */
export function trimNoteBody(body: string): string {
  return body.trim();
}

export function prepareNoteBody(body: string): string {
  const trimmed = trimNoteBody(body);

  if (trimmed.length === 0) {
    throw new NoteValidationError('note_empty');
  }

  if (noteCharacterCount(trimmed) > NOTE_MAX_CHARACTERS) {
    throw new NoteValidationError('note_too_long');
  }

  return trimmed;
}
