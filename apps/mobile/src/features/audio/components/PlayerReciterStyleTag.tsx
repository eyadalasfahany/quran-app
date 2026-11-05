import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// The pill's radius is 10 in the frame; no radius token matches, so it stays local (as in ReciterStyleTag).
const TAG_RADIUS = 10;

// The recitation style («مرتّل», «مجوّد», «معلّم») as a gold pill with a hairline, on the dark player.
export function PlayerReciterStyleTag({ label, testID }: { label: string; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        borderColor: theme.colors.playerLine,
        borderRadius: TAG_RADIUS,
        borderWidth: theme.stroke.hairline,
        paddingHorizontal: theme.space[2],
      }}
      testID={testID}
    >
      <UiText style={{ color: theme.colors.playerAccent }} variant="label" weight={600}>
        {label}
      </UiText>
    </View>
  );
}
