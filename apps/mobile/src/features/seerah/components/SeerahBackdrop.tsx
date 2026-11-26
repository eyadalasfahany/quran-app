import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { seerahArtFor } from '../art/seerah-art';

/**
 * The region's art, still, under a state card (frames SeerahStateDownloading, …Offline, …Error): the map the reader will get,
 * without pins. It takes the pointer events away so nothing under the card can be panned by accident.
 */
export function SeerahBackdrop({ levelId = 'region', testID = 'seerah-backdrop' }: { levelId?: string; testID?: string }) {
  const theme = useTheme();
  const art = seerahArtFor(levelId, theme.name);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface, overflow: 'hidden' }]}
      testID={testID}
    >
      {art === null ? null : <SvgXml height="100%" preserveAspectRatio="xMidYMid slice" width="100%" xml={art} />}
    </View>
  );
}
