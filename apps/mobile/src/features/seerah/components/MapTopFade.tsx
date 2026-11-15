import { View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * The fade at the top of the map (frame SeerahMapRegion): the page surface at 92% under the status bar and the header,
 * clearing to the map 24 pt below the header. Decorative, never touched.
 */
export function MapTopFade({ height, testID = 'seerah-map-fade' }: { height: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        backgroundImage: `linear-gradient(to bottom, ${theme.colors.surface}, transparent)`,
        height,
        left: 0,
        opacity: 0.92,
        position: 'absolute',
        right: 0,
        top: 0,
      }}
      testID={testID}
    />
  );
}
