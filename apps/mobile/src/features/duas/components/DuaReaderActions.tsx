import type { ReactNode } from 'react';

import { ReaderActionButtons } from '@/features/azkar/components/ReaderActionButtons';

import { toggleDuaFavorite } from '../data/favorites-repository';
import { useIsDuaFavorite } from '../data/hooks';

/**
 * The dua's action row: favourite (live from user.db), share, text size (screens/, #DuaHadithDetail). `play` is drawn after
 * text size; only a Quranic dua passes it (its verse range play, ADR 0092 decision 3). A hadith dua passes none, so it has
 * no play control.
 */
export function DuaReaderActions({
  duaKey,
  onShare,
  onTextSize,
  textSizeOpen,
  play,
  testID = 'dua-reader-actions',
}: {
  duaKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  play?: ReactNode;
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
      trailingAction={play}
    />
  );
}
