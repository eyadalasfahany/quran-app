import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { useIsFavorite } from '../data';
import { toggleFavorite } from '../data/favorites-repository';

const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const BOOKMARK_FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

/**
 * The actions under the dhikr: text size (Aa), share and favourite. The favourite is saved per entry in user.db
 * and follows the live query, so it stays in step on every screen.
 */
export function AzkarReaderActions({
  entryKey,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'azkar-reader-actions',
}: {
  entryKey: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
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
          Aa
        </UiText>
      </Pressable>
      <IconButton hint={undefined} icon={SHARE} label={t('azkar.reader.share')} onPress={onShare} testID="azkar-share" tone="muted" variant="plain" />
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
    </View>
  );
}
