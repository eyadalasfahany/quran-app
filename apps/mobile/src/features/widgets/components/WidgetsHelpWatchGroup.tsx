import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SettingsGroup } from '@/features/settings/components/SettingsGroup';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** Wear OS tile and Apple Watch: shipped with the watch apps (prompts 15–16). */
export function WidgetsHelpWatchGroup({ testID = 'widgets-help-watch' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SettingsGroup testID={testID} title={t('widgetsHelp.sections.watch')}>
      <View style={{ paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] }}>
        <UiText tone="muted" variant="subhead">
          {t('widgetsHelp.watch.body')}
        </UiText>
      </View>
    </SettingsGroup>
  );
}
