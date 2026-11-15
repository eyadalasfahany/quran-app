import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// IBM Plex Sans Arabic keeps a deep descent under its digits, so a centred line box draws them about 1 pt high; 2 pt of
// top padding (half of it net, once the box is centred) puts the glyph on the disc's centre, as the frames draw it.
export const DIGITS = { fontSize: 13, includeFontPadding: false, lineHeight: 16, paddingTop: 2, textAlignVertical: 'center' } as const;

/**
 * The event count inside a cluster or city pin (frames SeerahMapRegion, SeerahMapKey): a 30 pt brand disc with the count at
 * 13, weight 700, inside a 2 pt raised ring, over a soft drop shadow. `size` is the disc without its ring. Decorative.
 */
export function CountDisc({
  count,
  size = 30,
  testID,
}: {
  count: number;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const ring = theme.stroke.selectedRing;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.brand,
        borderColor: theme.colors.surfaceRaised,
        borderRadius: size / 2 + ring,
        borderWidth: ring,
        boxShadow: `0 1px 3px ${theme.colors.coverShadow}`,
        height: size + 2 * ring,
        justifyContent: 'center',
        width: size + 2 * ring,
      }}
      testID={testID}
    >
      <UiText align="center" scale="bar" style={DIGITS} tone="onBrand" variant="label" weight={700}>
        {formatNumber(count, locale)}
      </UiText>
    </View>
  );
}
