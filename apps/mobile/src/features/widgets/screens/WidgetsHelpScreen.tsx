import type { Href } from 'expo-router';
import { goBackOr } from '@/core/navigation/go-back';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { Screen } from '@/shared/ui';

import { WidgetsHelpAndroidGroup } from '../components/WidgetsHelpAndroidGroup';
import { WidgetsHelpCatalogGroup } from '../components/WidgetsHelpCatalogGroup';
import { WidgetsHelpIntro } from '../components/WidgetsHelpIntro';
import { WidgetsHelpIosGroup } from '../components/WidgetsHelpIosGroup';
import { WidgetsHelpWatchGroup } from '../components/WidgetsHelpWatchGroup';

/**
 * Widgets and watch usage help (`screens/`, #WidgetsHelp; route `/settings/widgets`).
 * Mirrors Settings sub-screens such as `/settings/sources` and the reminders hub layout.
 */
export function WidgetsHelpScreen({ testID = 'widgets-help-screen' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.space[4]} testID="widgets-help-column">
        <SettingsHeader onBack={() => goBackOr('/settings' as Href)} testID="widgets-help-header" title={t('widgetsHelp.title')} />
        <ScrollView
          contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[6], paddingTop: theme.space[4] }}
          style={{ flex: 1 }}
        >
          <WidgetsHelpIntro />
          <WidgetsHelpCatalogGroup />
          <WidgetsHelpAndroidGroup />
          <WidgetsHelpIosGroup />
          <WidgetsHelpWatchGroup />
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
