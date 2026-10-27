import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Divider } from './Divider';
import { UiText } from './UiText';

// The break between two Mushaf pages: a rule on each side of the new page's place.
export function PageDivider({ label, testID }: { label: string; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], marginVertical: theme.space[5] }}
      testID={testID}
    >
      <Divider style={{ flex: 1 }} />
      <UiText tone="muted" variant="label">
        {label}
      </UiText>
      <Divider style={{ flex: 1 }} />
    </View>
  );
}
