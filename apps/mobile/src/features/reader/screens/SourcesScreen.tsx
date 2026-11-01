import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { ListRow, ScreenHeader } from '@/shared/ui';

export function SourcesScreen({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.space[4] }} testID={testID}>
      {/* The column caps the rows at 720 on wide windows (spec §4). Its gutter is 0: the rows keep their phone layout. */}
      <ContentColumn gutter={0} testID={testID ? `${testID}-column` : undefined}>
        <View style={{ paddingHorizontal: theme.space[4] }}>
          <ScreenHeader testID={testID ? `${testID}-header` : undefined} title={t('reader.sources.title')} />
        </View>
        <ListRow title={t('reader.sources.qfFonts')} testID={testID ? `${testID}-qf-fonts` : undefined} />
      </ContentColumn>
    </ScrollView>
  );
}
