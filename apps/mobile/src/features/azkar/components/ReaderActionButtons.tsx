import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const BOOKMARK_FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

/**
 * The reader's action row under the text: favourite, share, text size (Aa). Presentational only; the caller says whether
 * the item is a favourite and what toggling it does. Azkar and Duas both draw it (quran-app-screens.html, #AzkarReader and
 * #DuaHadithDetail).
 */
export function ReaderActionButtons({
  favorite,
  onToggleFavorite,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'reader-action-buttons',
}: {
  favorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[6], justifyContent: 'center' }} testID={testID}>
      <IconButton
        icon={favorite ? BOOKMARK_FILLED : BOOKMARK}
        label={favorite ? t('azkar.reader.favouriteRemove') : t('azkar.reader.favouriteAdd')}
        onPress={onToggleFavorite}
        pressed={favorite}
        testID="azkar-favourite"
        tone="muted"
        variant="plain"
      />
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
