import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { VisibilityZone } from '../data/crescent';

const ZONES: VisibilityZone[] = ['A', 'B', 'C', 'D'];

/** Four segment zone scale (quran-app-screens.html, #MoonSighting). */
export function VisibilityZoneScale({ active, testID = 'moon-zone-scale' }: { active: VisibilityZone; testID?: string }) {
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: theme.space[1] }} testID={testID}>
      {ZONES.map((zone) => {
        const selected = zone === active;
        return (
          <View
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={zone}
            style={{
              backgroundColor: selected ? theme.colors.brand : theme.colors.fillSecondary,
              borderRadius: theme.radius.sm,
              flex: 1,
              height: 28,
            }}
            testID={`${testID}-${zone}`}
          />
        );
      })}
    </View>
  );
}
