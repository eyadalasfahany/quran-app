import { I18nManager, Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { GlassSurface, Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

import type { EdgeDirection } from '../logic';

import { DIGITS } from './CountDisc';

export type EdgeChipDirection = EdgeDirection | 'other';

const ICONS: Record<EdgeChipDirection, IconName> = {
  north: { ios: 'arrow.up', android: 'arrow_upward' },
  south: { ios: 'arrow.down', android: 'arrow_downward' },
  west: { ios: 'arrow.left', android: 'arrow_back' },
  east: { ios: 'arrow.right', android: 'arrow_forward' },
  other: { ios: 'mappin', android: 'location_on' },
};

/**
 * A chip fixed to the screen's edge for events the map cannot show in place: a region beyond the window (a geographic arrow,
 * a tap centres it) or the «أخرى» bucket (a dashed edge and a pin, no position). Frame SeerahMapRegion: glass, 36 pt tall
 * (the 44 pt target less a 4 pt hit slop on each side), the arrow first, then the name (13, weight 600) and the count in an
 * 18 pt brand pill. The padding is physical in both languages (10 left, 12 right). The arrow never mirrors.
 */
export function EdgeChip({
  label,
  count,
  direction,
  accessibilityLabel,
  accessibilityHint,
  dimmed = false,
  symbol = false,
  onPress,
  testID,
}: {
  label: string;
  count: number;
  direction: EdgeChipDirection;
  accessibilityLabel: string;
  accessibilityHint?: string;
  dimmed?: boolean;
  /** The map key's sample (frame SeerahMapKey): a 40 × 28 chip with only its 16 pt glyph. */
  symbol?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const other = direction === 'other';
  const disc = theme.size.iconSm;

  if (symbol) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: other ? 'transparent' : theme.colors.glassFill,
          borderColor: other ? colors.inkMuted : colors.line,
          borderRadius: 14,
          borderStyle: other ? 'dashed' : 'solid',
          borderWidth: other ? theme.stroke.focus : theme.stroke.hairline,
          height: 28,
          justifyContent: 'center',
          width: 40,
        }}
        testID={testID}
      >
        <Icon color={theme.colors.brand} name={ICONS[direction]} size={16} testID={`${testID ?? 'edge'}-arrow`} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityElementsHidden={dimmed}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={theme.space[1]}
      importantForAccessibility={dimmed ? 'no-hide-descendants' : 'auto'}
      onPress={onPress}
      style={{ alignSelf: 'flex-start', opacity: dimmed ? theme.opacity.disabled : 1 }}
      testID={testID}
    >
      <GlassSurface interactive
        colorScheme={theme.name === 'dark' ? 'dark' : 'light'}
        radius="pill"
        style={{
          alignItems: 'center',
          // The overlay is laid out physically (LTR); the chip's own row keeps the app's direction.
          direction: I18nManager.isRTL ? 'rtl' : 'ltr',
          flexDirection: 'row',
          gap: 6,
          minHeight: theme.size.touchTarget - 2 * theme.space[1],
          paddingLeft: 10,
          paddingRight: theme.space[3],
          ...(other ? { borderColor: colors.inkMuted, borderStyle: 'dashed', borderWidth: theme.stroke.focus } : { borderStyle: 'solid' }),
        }}
        testID={testID === undefined ? undefined : `${testID}-surface`}
      >
        <Icon color={theme.colors.brand} name={ICONS[direction]} size={theme.size.iconSm} testID={`${testID ?? 'edge'}-arrow`} />
        <UiText scale="bar" style={{ fontSize: 13, lineHeight: 18 }} variant="caption" weight={600}>
          {label}
        </UiText>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.brand,
            borderRadius: disc / 2,
            height: disc,
            justifyContent: 'center',
            minWidth: disc,
            paddingHorizontal: 6,
          }}
          testID={testID === undefined ? undefined : `${testID}-count`}
        >
          <UiText align="center" scale="bar" style={{ ...DIGITS, fontSize: 12, lineHeight: 15 }} tone="onBrand" variant="label" weight={700}>
            {formatNumber(count, locale)}
          </UiText>
        </View>
      </GlassSurface>
    </Pressable>
  );
}
