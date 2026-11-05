import type { AzkarRecording } from '../data/model';
import { useIsFavorite } from '../data';
import { toggleFavorite } from '../data/favorites-repository';
import { ReaderActionButtons } from './ReaderActionButtons';
// Play and download — kept for later; hidden for now (developer 4 Nov 2026).
// import { AzkarDownloadButton } from './AzkarDownloadButton';
// import { AzkarPlayerControl } from './AzkarPlayerControl';

/**
 * The actions under the dhikr: favourite, share, text size (Aa). Play/pause and download are commented out for now
 * (developer 4 Nov 2026); the props and commented block stay so they can return without an API change. Playback lives
 * here; the reader has no mini player bar. The favourite is saved per entry in user.db and follows the live query.
 * The row itself is `ReaderActionButtons`, shared with Duas.
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
  // Props kept so callers and the commented play/download block stay typed.
  void recording;
  void playControl;

  return (
    <>
      <ReaderActionButtons
        favorite={favorite}
        onShare={onShare}
        onTextSize={onTextSize}
        onToggleFavorite={() => {
          toggleFavorite(entryKey);
        }}
        testID={testID}
        textSizeOpen={textSizeOpen}
      />
      {/* Play and download — kept for later; hidden for now (developer 4 Nov 2026).
      {playControl == null ? null : (
        <AzkarPlayerControl
          loading={playControl.loading === true}
          onPress={playControl.onToggle}
          playing={playControl.playing}
          testID="azkar-actions-play"
        />
      )}
      {recording === null ? null : <AzkarDownloadButton recording={recording} />}
      */}
    </>
  );
}
