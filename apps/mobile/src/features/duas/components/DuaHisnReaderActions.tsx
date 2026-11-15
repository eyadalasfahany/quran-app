import { ReaderActionButtons } from '@/features/azkar/components/ReaderActionButtons';
import { toggleAzkarFavorite, useIsFavorite } from '@/features/azkar/data';

/**
 * The actions under a Hisn dua: favourite, share, text size (screens/, #DuaHadithDetail). The favourite is the Azkar
 * favourite of the entry, so it is the same one the Azkar reader and list use. No audio here (ADR 0055).
 */
export function DuaHisnReaderActions({
  entryKey,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'dua-hisn-reader-actions',
}: {
  entryKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
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
    />
  );
}
