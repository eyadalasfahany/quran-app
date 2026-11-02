import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { SettingsGroup } from '@/features/settings/components/SettingsGroup';
import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { WIDGETS_HELP_CATALOG } from '../data/widgets-help-catalog';
import { WidgetsHelpPinRow } from './WidgetsHelpPinRow';
import { WidgetsHelpSteps } from './WidgetsHelpSteps';

/** Android: picker steps plus a pin row per widget when pinning is available. */
export function WidgetsHelpAndroidGroup({ testID = 'widgets-help-android' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const showPins = Platform.OS === 'android';

  return (
    <SettingsGroup testID={testID} title={t('widgetsHelp.sections.android')}>
      <WidgetsHelpSteps namespace="widgetsHelp.android" testID={`${testID}-steps`} />
      {showPins ? (
        <View
          style={{
            borderTopColor: colors.line,
            borderTopWidth: theme.stroke.hairline,
          }}
        >
          {WIDGETS_HELP_CATALOG.map(({ id, provider }) => (
            <WidgetsHelpPinRow
              key={id}
              testID={`widgets-help-pin-${id}`}
              title={t(`widgetsHelp.items.${id}.title`)}
              widgetName={provider}
            />
          ))}
        </View>
      ) : null}
    </SettingsGroup>
  );
}
