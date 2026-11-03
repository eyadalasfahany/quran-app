import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui';

import type { PrayerTimesOutput } from '../data/prayer-times';

const ICONS: Record<keyof PrayerTimesOutput, IconName> = {
  fajr: { ios: 'moon.stars', android: 'nights_stay' },
  sunrise: { ios: 'sunrise.fill', android: 'wb_twilight' },
  dhuhr: { ios: 'sun.max.fill', android: 'light_mode' },
  asr: { ios: 'sun.min.fill', android: 'wb_sunny' },
  maghrib: { ios: 'sunset.fill', android: 'wb_twilight' },
  isha: { ios: 'moon.fill', android: 'dark_mode' },
};

/**
 * Leading glyph chip for a times-card row (ADR 0057 times-card redesign):
 * soft fill disc; brand when active, muted when past / sunrise.
 */
export function PrayerRowIcon({
  prayerKey,
  active = false,
  muted = false,
  testID,
}: {
  prayerKey: keyof PrayerTimesOutput;
  active?: boolean;
  muted?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const color = active ? theme.colors.brand : muted ? theme.colors.inkMuted : theme.colors.ink;
  const fill = active ? theme.colors.glassSelected : theme.colors.fillSecondary;

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: fill,
        borderRadius: theme.radius.md,
        height: theme.size.touchTarget,
        justifyContent: 'center',
        width: theme.size.touchTarget,
      }}
      testID={testID}
    >
      <Icon color={color} name={ICONS[prayerKey]} size={theme.size.icon} testID={testID ? `${testID}-glyph` : undefined} />
    </View>
  );
}
