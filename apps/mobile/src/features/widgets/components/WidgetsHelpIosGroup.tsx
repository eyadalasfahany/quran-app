import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { SettingsGroup } from '@/features/settings/components/SettingsGroup';
import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { WIDGETS_HELP_CATALOG } from '../data/widgets-help-catalog';
import { WidgetsHelpPinRow } from './WidgetsHelpPinRow';
import { WidgetsHelpSteps } from './WidgetsHelpSteps';

/** iPhone: manual steps plus an add preview for each widget kind (ADR 0054). */
export function WidgetsHelpIosGroup({ testID = 'widgets-help-ios' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const showAddRows = Platform.OS === 'ios';

  return (
    <SettingsGroup testID={testID} title={t('widgetsHelp.sections.ios')}>
      <WidgetsHelpSteps namespace="widgetsHelp.ios" testID={`${testID}-steps`} />
      {showAddRows ? (
        <View
          style={{
            borderTopColor: colors.line,
            borderTopWidth: theme.stroke.hairline,
          }}
        >
          {WIDGETS_HELP_CATALOG.map(({ id }) => (
            <WidgetsHelpPinRow
              key={id}
              catalogId={id}
              testID={`widgets-help-add-${id}`}
              title={t(`widgetsHelp.items.${id}.title`)}
            />
          ))}
        </View>
      ) : null}
    </SettingsGroup>
  );
}
