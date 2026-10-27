import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';

export function SearchShowMore({ onPress, testID = 'search-show-more' }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignItems: 'center', minHeight: 44, paddingVertical: theme.space[4] }}
      testID={testID}
    >
      <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.brand }]}>
        {t('search.showMore')}
      </Text>
    </Pressable>
  );
}
