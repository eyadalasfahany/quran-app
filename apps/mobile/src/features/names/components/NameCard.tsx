import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import type { NameSummary } from '../data/model';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark_border' } as const;
const BOOKMARK_FILL = { ios: 'bookmark.fill', android: 'bookmark' } as const;

export function NameCard({
  item,
  onPress,
  onFavouritePress,
  testID = 'name-card',
}: {
  item: NameSummary;
  onPress: () => void;
  onFavouritePress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={t('names.card.a11y', { position: item.position })}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        gap: theme.space[3],
        padding: theme.space[4],
      }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View
          style={{
            alignItems: 'center',
            borderColor: theme.colors.brand,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            height: 32,
            justifyContent: 'center',
            width: 32,
          }}
        >
          <UiText variant="caption">{item.position}</UiText>
        </View>
        <IconButton
          icon={item.isFavourite ? BOOKMARK_FILL : BOOKMARK}
          label={item.isFavourite ? t('names.detail.favouriteRemove') : t('names.detail.favourite')}
          onPress={onFavouritePress}
          pressed={item.isFavourite}
          testID={`${testID}-favourite`}
          variant="plain"
        />
      </View>
      <UiText style={{ textAlign: 'center' }} variant="title">
        {item.nameAr}
      </UiText>
    </Pressable>
  );
}
