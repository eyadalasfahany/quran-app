import { amiriNaturalLeading, typeScale } from '@quran/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

const DISPLAY_MD = typeScale.displayMd;
// typeScale.displayMd lineHeight (36) is too tight for Amiri; ascenders clip on iOS (design-tokens typography).
const DISPLAY_MD_LINE = Math.round(DISPLAY_MD.size * amiriNaturalLeading);

// The large title at the top of a screen, with an optional hint under it and a trailing control
// (a search button). Controls that belong to the header (a segment, a search field) go in children.
export function ScreenHeader({
  title,
  hint,
  trailing,
  children,
  testID,
}: {
  title?: string;
  hint?: string;
  trailing?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    // The Screen already sits below the safe area, so the title starts at its top edge (the frames' 56 pt
    // is the status bar). The blocks under the title are spaced by the parent.
    <View style={{ gap: theme.size.blockGap }} testID={testID}>
      {title ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <UiText
            accessibilityRole="header"
            style={{
              flex: 1,
              lineHeight: DISPLAY_MD_LINE,
              paddingBottom: theme.space[1],
              paddingTop: theme.space[2],
            }}
            variant="displayMd"
          >
            {title}
          </UiText>
          {trailing}
        </View>
      ) : null}
      {children}
      {hint ? (
        <UiText tone="muted" variant="caption">
          {hint}
        </UiText>
      ) : null}
    </View>
  );
}
