import { ReaderActionButtons } from '@/features/azkar/components/ReaderActionButtons';

import { toggleDuaFavorite } from '../data/favorites-repository';
import { useIsDuaFavorite } from '../data/hooks';

/** The dua's action row: favourite (live from user.db), share, text size (quran-app-screens.html, #DuaHadithDetail). */
export function DuaReaderActions({
  duaKey,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'dua-reader-actions',
}: {
  duaKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  testID?: string;
}) {
  const favorite = useIsDuaFavorite(duaKey);

  return (
    <ReaderActionButtons
      favorite={favorite}
      onShare={onShare}
      onTextSize={onTextSize}
      onToggleFavorite={() => {
        toggleDuaFavorite(duaKey);
      }}
      testID={testID}
      textSizeOpen={textSizeOpen}
    />
  );
}
