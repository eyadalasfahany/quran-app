import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import type { WidgetAddCatalogId } from '../data/widget-add-catalog';
import { WidgetAddTrigger } from './WidgetAddTrigger';

/** Android row: widget title and the pin action (quran-app-screens.html, #WidgetsHelp). */
export function WidgetsHelpPinRow({
  title,
  catalogId,
  testID,
}: {
  title: string;
  catalogId: WidgetAddCatalogId;
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
      <WidgetAddTrigger catalogId={catalogId} testID={testID ? `${testID}-add` : undefined} />
    </View>
  );
}
