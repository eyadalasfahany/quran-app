import { MiniPlayerNotice } from './MiniPlayerNotice';

// «هذا الجزء غير مسجّل لهذا القارئ» (ADR 0077 amendment): the line a bar shows when a partial surah's file does not
// record what was asked for. It is the skip notice's line (one gold-ink status line that dissolves in and out), so it
// needs no frame of its own (developer approval, 7 Nov 2026). The caller passes the translated message.
export function PartialRangeNotice({ message, testID = 'partial-range-notice' }: { message: string; testID?: string }) {
  return <MiniPlayerNotice message={message} testID={testID} />;
}
