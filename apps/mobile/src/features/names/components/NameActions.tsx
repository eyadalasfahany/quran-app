import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark_border' } as const;
const BOOKMARK_FILL = { ios: 'bookmark.fill', android: 'bookmark' } as const;

function ActionTile({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        flex: 1,
        gap: theme.space[2],
        minHeight: 72,
        justifyContent: 'center',
        padding: theme.space[3],
      }}
      testID={testID}
    >
      <Icon color={colors.ink} name={icon} size={22} />
      <UiText variant="caption">{label}</UiText>
    </Pressable>
  );
}

export function NameActions({
  isFavourite,
  onFavouritePress,
  onSharePress,
  testID = 'name-actions',
}: {
  isFavourite: boolean;
  onFavouritePress: () => void;
  onSharePress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ flexDirection: 'row', gap: 12 }} testID={testID}>
      <ActionTile
        icon={isFavourite ? BOOKMARK_FILL : BOOKMARK}
        label={isFavourite ? t('names.detail.favouriteRemove') : t('names.detail.favourite')}
        onPress={onFavouritePress}
        testID={`${testID}-favourite`}
      />
      <ActionTile
        icon={SHARE}
        label={t('names.detail.share')}
        onPress={onSharePress}
        testID={`${testID}-share`}
      />
    </View>
  );
}
