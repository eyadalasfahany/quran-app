import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ListRow, uiTextProps } from '@/shared/ui';

export function SourcesScreen({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.space[4] }} testID={testID}>
      <View style={{ paddingHorizontal: theme.space[4], paddingBottom: theme.space[2] }}>
        <Text
          {...uiTextProps('title')}
          accessibilityRole="header"
          style={[theme.text.title, { color: theme.colors.ink }]}
        >
          {t('reader.sources.title')}
        </Text>
      </View>
      <ListRow title={t('reader.sources.qfFonts')} testID={testID ? `${testID}-qf-fonts` : undefined} />
    </ScrollView>
  );
}
