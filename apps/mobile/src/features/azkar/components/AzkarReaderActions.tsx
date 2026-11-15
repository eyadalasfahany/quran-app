import type { AzkarRecording } from '../data/model';
import { useIsFavorite } from '../data';
import { toggleFavorite } from '../data/favorites-repository';
import { AzkarDownloadButton } from './AzkarDownloadButton';
import { AzkarPlayerControl } from './AzkarPlayerControl';
import { ReaderActionButtons } from './ReaderActionButtons';

/**
 * The actions under the dhikr (screens/, #AzkarReaderAudio): favourite, share, text size (Aa), then play and download
 * when the unit has a licensed recording (developer, 15 Nov 2026). Play draws only when `playControl` is given (no
 * recording, or offline without a download, draws none). Download draws only for a recording that allows it
 * (`AzkarDownloadButton` draws nothing otherwise). Playback lives here; the reader has no mini player bar. The favourite
 * is saved per entry in user.db and follows the live query. The row itself is `ReaderActionButtons`, shared with Duas.
 */
export function AzkarReaderActions({
  entryKey,
  onShare,
  onTextSize,
  textSizeOpen,
  recording = null,
  playControl = null,
  testID = 'azkar-reader-actions',
}: {
  entryKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  /** The unit's licensed recording, or null. Null draws no download control. */
  recording?: AzkarRecording | null;
  /** Play and pause when the caller shows licensed audio; null hides the control (offline or no recording). */
  playControl?: { playing: boolean; loading?: boolean; onToggle: () => void } | null;
  testID?: string;
}) {
  const favorite = useIsFavorite(entryKey);

  return (
    <ReaderActionButtons
      favorite={favorite}
      onShare={onShare}
      onTextSize={onTextSize}
      onToggleFavorite={() => {
        toggleFavorite(entryKey);
      }}
      testID={testID}
      textSizeOpen={textSizeOpen}
      trailingAction={
        <>
          {playControl === null ? null : (
            <AzkarPlayerControl
              loading={playControl.loading === true}
              onPress={playControl.onToggle}
              playing={playControl.playing}
              testID="azkar-actions-play"
            />
          )}
          {recording === null ? null : <AzkarDownloadButton recording={recording} />}
        </>
      }
    />
  );
}
