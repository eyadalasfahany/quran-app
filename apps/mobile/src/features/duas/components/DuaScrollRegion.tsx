import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

import { DuaEdgeFade } from './DuaEdgeFade';

/** The fade above the actions bar (screens/, #DuaHadithDetail: 72 pt). */
const BOTTOM_FADE_HEIGHT = 72;

/**
 * The scrolled text of a dua detail, with a fade at its top (under the progress bar) and at its bottom (above the
 * actions), so scrolled text fades out instead of colliding with the bars.
 */
export function DuaScrollRegion({
  children,
  contentContainerStyle,
  testID = 'dua-scroll-region',
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <ScrollView
        contentContainerStyle={[
          { flexGrow: 1, gap: theme.size.sectionGap, paddingBottom: theme.space[6], paddingTop: theme.space[4] },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
      <DuaEdgeFade edge="top" height={theme.space[4]} testID="dua-scroll-fade-top" />
      <DuaEdgeFade edge="bottom" height={BOTTOM_FADE_HEIGHT} testID="dua-scroll-fade-bottom" />
    </View>
  );
}
