import type { ReactNode } from 'react';
import { useId } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** Label-to-control gap in a stacked block (screens/: gap 6px). */
export const SECTION_STACK_GAP = 6;

/**
 * One block in the Reader settings sheet: a 13 pt muted label above its control
 * (stacked), or the label at the start and the control at the end (inline).
 */
export function SettingsSection({
  label,
  layout = 'stacked',
  children,
  testID,
}: {
  label: string;
  layout?: 'stacked' | 'inline';
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const labelId = useId();
  const inline = layout === 'inline';

  return (
    <View
      style={
        inline
          ? { alignItems: 'center', flexDirection: 'row', gap: theme.space[3], justifyContent: 'space-between' }
          : { gap: SECTION_STACK_GAP }
      }
      testID={testID}
    >
      <UiText nativeID={labelId} testID={testID ? `${testID}-label` : undefined} tone="muted" variant="caption">
        {label}
      </UiText>
      <View accessibilityLabelledBy={labelId} testID={testID ? `${testID}-control` : undefined}>
        {children}
      </View>
    </View>
  );
}
