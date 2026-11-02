import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import type { WidgetProviderName } from '../android/names';
import { WidgetPinButton } from './WidgetPinButton';

/** Android row: widget title and the pin action (quran-app-screens.html, #WidgetsHelp). */
export function WidgetsHelpPinRow({
  title,
  widgetName,
  testID,
}: {
  title: string;
  widgetName: WidgetProviderName;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 52,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[3],
      }}
      testID={testID}
    >
      <UiText style={{ flex: 1 }} variant="body" weight={600}>
        {title}
      </UiText>
      <WidgetPinButton testID={testID ? `${testID}-pin` : undefined} widgetName={widgetName} />
    </View>
  );
}
