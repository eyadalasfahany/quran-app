import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

// The Mushaf's double gold rule. 'page' is the page border from the Mushaf frame; 'band' is the
// tighter rule around a surah name.
export type GoldFrameVariant = 'page' | 'band';

export function GoldFrame({
  children,
  variant = 'page',
  style,
  contentStyle,
  testID,
}: {
  children?: ReactNode;
  variant?: GoldFrameVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const page = variant === 'page';

  return (
    <View
      style={[
        {
          borderColor: theme.colors.gold,
          borderRadius: page ? theme.size.frameRadius : theme.size.bandRadius,
          borderWidth: page ? theme.stroke.frame : theme.stroke.hairline,
          padding: page ? theme.size.frameInset : theme.size.bandInset,
        },
        style,
      ]}
      testID={testID}
    >
      <View
        style={[
          {
            borderColor: theme.colors.gold,
            borderRadius: page ? theme.size.frameInnerRadius : theme.size.bandInnerRadius,
            borderWidth: theme.stroke.frameInner,
          },
          contentStyle,
        ]}
        testID={testID ? `${testID}-inner` : undefined}
      >
        {children}
      </View>
    </View>
  );
}
