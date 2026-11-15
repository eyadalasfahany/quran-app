import {
  AzkarDownloadButton,
  AzkarPlayerControl,
  type AzkarEntryPlayControl,
} from '@/features/azkar';
import { ReaderActionButtons } from '@/features/azkar/components/ReaderActionButtons';
import { toggleAzkarFavorite, useIsFavorite } from '@/features/azkar/data';
import type { AzkarRecording } from '@/features/azkar/data/model';

/**
 * The actions under a Hisn dua: favourite, share, text size, then the recording's play and download (screens/,
 * #DuaHisnDetailAudio; ADR 0092 decision 3). The favourite is the Azkar favourite of the entry, so the Azkar reader and
 * list use the same one. Play is drawn only when `playControl` is given (no recording, or offline, draws none), and the
 * download only for a recording that allows it (`AzkarDownloadButton` draws nothing otherwise). Both are the Azkar
 * reader's own controls, from the public `features/azkar` API.
 */
export function DuaHisnReaderActions({
  entryKey,
  onShare,
  onTextSize,
  textSizeOpen,
  recording = null,
  playControl = null,
  testID = 'dua-hisn-reader-actions',
}: {
  entryKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  /** The entry's recording, or null. Null draws no download control. */
  recording?: AzkarRecording | null;
  /** Play and pause, or null to hide the control (ADR 0092 decision 3). */
  playControl?: AzkarEntryPlayControl | null;
  testID?: string;
}) {
  const favorite = useIsFavorite(entryKey);

  return (
    <ReaderActionButtons
      favorite={favorite}
      onShare={onShare}
      onTextSize={onTextSize}
      onToggleFavorite={() => {
        toggleAzkarFavorite(entryKey);
      }}
      testID={testID}
      textSizeOpen={textSizeOpen}
      trailingAction={
        <>
          {playControl === null ? null : (
            <AzkarPlayerControl
              loading={playControl.loading}
              onPress={playControl.onToggle}
              playing={playControl.playing}
              testID="dua-hisn-play"
            />
          )}
          <AzkarDownloadButton recording={recording} testID="dua-hisn-download" />
        </>
      }
    />
  );
}
