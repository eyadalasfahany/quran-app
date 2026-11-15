import { StyleSheet, View } from "react-native";

import { useTheme } from "@/core/theme";
import { Icon, UiText, useContrastColors, type IconName } from "@/shared/ui";

const BADGE = 40;
const TINT_OPACITY = 0.1;

/**
 * One section tile on the tour (screens/frames/onboarding/OnboardTour): a brand-tint badge with the icon, the
 * section name and one muted line. Information only, not a button, so it reads as one plain text element.
 */
export function OnboardingTourTile({
  icon,
  name,
  line,
  testID,
}: {
  icon: IconName;
  name: string;
  line: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${line}`}
      accessibilityRole="text"
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: theme.stroke.hairline,
        flexGrow: 1,
        gap: theme.space[2],
        padding: theme.space[4],
      }}
      testID={testID}
    >
      <View
        style={{
          alignItems: "center",
          borderRadius: BADGE / 2,
          height: BADGE,
          justifyContent: "center",
          overflow: "hidden",
          width: BADGE,
        }}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.brand, opacity: TINT_OPACITY },
          ]}
        />
        <Icon color={theme.colors.brand} name={icon} />
      </View>
      <UiText variant="displaySm">{name}</UiText>
      <UiText tone="muted" variant="caption">
        {line}
      </UiText>
    </View>
  );
}
