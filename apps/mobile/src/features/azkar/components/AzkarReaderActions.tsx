import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import type { AzkarRecording } from '../data/model';
import { useIsFavorite } from '../data';
import { toggleFavorite } from '../data/favorites-repository';
import { AzkarDownloadButton } from './AzkarDownloadButton';

const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const BOOKMARK_FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

/**
 * The actions under the dhikr: text size (Aa), share, favourite and, when the unit has a licensed recording, its download
 * (ADR 0031 §8). Playback is not here: the reader's player bar owns play and pause. The favourite is saved per entry in
 * user.db and follows the live query, so it stays in step on every screen.
 */
export function AzkarReaderActions({
  entryKey,
  onShare,
  onTextSize,
  textSizeOpen,
  recording = null,
  testID = 'azkar-reader-actions',
}: {
  entryKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  /** The unit's licensed recording, or null. Null draws no download control. */
  recording?: AzkarRecording | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const favorite = useIsFavorite(entryKey);

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[6], justifyContent: 'center' }} testID={testID}>
      <Pressable
        accessibilityLabel={t('azkar.reader.textSize')}
        accessibilityRole="button"
        accessibilityState={{ expanded: textSizeOpen }}
        onPress={onTextSize}
        style={{ alignItems: 'center', justifyContent: 'center', minHeight: theme.size.touchTarget, minWidth: theme.size.touchTarget }}
        testID="azkar-text-size-toggle"
      >
        <UiText tone={textSizeOpen ? 'brand' : 'muted'} variant="subhead" weight={600}>
          {t('azkar.reader.textSizeGlyph')}
        </UiText>
      </Pressable>
      <IconButton icon={SHARE} label={t('azkar.reader.share')} onPress={onShare} testID="azkar-share" tone="muted" variant="plain" />
      <IconButton
        icon={favorite ? BOOKMARK_FILLED : BOOKMARK}
        label={favorite ? t('azkar.reader.favouriteRemove') : t('azkar.reader.favouriteAdd')}
        onPress={() => {
          toggleFavorite(entryKey);
        }}
        pressed={favorite}
        testID="azkar-favourite"
        tone="muted"
        variant="plain"
      />
      {recording === null ? null : <AzkarDownloadButton recording={recording} />}
    </View>
  );
}
