import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const BOOKMARK_FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

/**
 * The reader's action row under the text: the first slot, share, text size (Aa). The first slot is the favourite bookmark
 * when the caller gives `onToggleFavorite`; a caller with another first action (the «أدعيتي» bell) passes `leadingAction`
 * instead; with neither, the slot is left out. Presentational only. Azkar, Quranic and hadith readers draw it
 * (screens/, #AzkarReader and #DuaHadithDetail).
 */
export function ReaderActionButtons({
  favorite = false,
  onToggleFavorite,
  leadingAction,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'reader-action-buttons',
}: {
  /** Whether the item is a favourite; drives the bookmark's filled glyph and label. */
  favorite?: boolean;
  /** Toggles the favourite. Omitted, the bookmark is not drawn. */
  onToggleFavorite?: () => void;
  /** A node drawn in the first slot instead of the bookmark. */
  leadingAction?: ReactNode;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const firstSlot =
    leadingAction !== undefined ? (
      leadingAction
    ) : onToggleFavorite !== undefined ? (
      <IconButton
        icon={favorite ? BOOKMARK_FILLED : BOOKMARK}
        label={favorite ? t('azkar.reader.favouriteRemove') : t('azkar.reader.favouriteAdd')}
        onPress={onToggleFavorite}
        pressed={favorite}
        testID="azkar-favourite"
        tone="muted"
        variant="plain"
      />
    ) : null;

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[6], justifyContent: 'center' }} testID={testID}>
      {firstSlot}
      <IconButton icon={SHARE} label={t('azkar.reader.share')} onPress={onShare} testID="azkar-share" tone="muted" variant="plain" />
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
    </View>
  );
}
