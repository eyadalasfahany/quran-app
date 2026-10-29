import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// The pill's radius is 10 in the frame; no radius token matches, so it stays local.
const TAG_RADIUS = 10;

// The recitation style («مرتّل», «مجوّد», «معلّم») as a gold-ink pill with a hairline.
export function ReciterStyleTag({ label, testID }: { label: string; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        borderColor: colors.line,
        borderRadius: TAG_RADIUS,
        borderWidth: theme.stroke.hairline,
        paddingHorizontal: theme.space[2],
      }}
      testID={testID}
    >
      <UiText tone="goldInk" variant="label" weight={600}>
        {label}
      </UiText>
    </View>
  );
}
