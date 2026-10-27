import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ListRow, ScreenHeader } from '@/shared/ui';

export function SourcesScreen({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.space[4] }} testID={testID}>
      <View style={{ paddingHorizontal: theme.space[4] }}>
        <ScreenHeader testID={testID ? `${testID}-header` : undefined} title={t('reader.sources.title')} />
      </View>
      <ListRow title={t('reader.sources.qfFonts')} testID={testID ? `${testID}-qf-fonts` : undefined} />
    </ScrollView>
  );
}
