import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { VisibilityZone } from '../data/crescent';

const ZONES: VisibilityZone[] = ['A', 'B', 'C', 'D'];
const LETTER_KEY = { A: 'a', B: 'b', C: 'c', D: 'd' } as const;

/** Four segments, each with its zone letter (أ ب ج د / A B C D); the active one is filled brand (#VisibilityEstimate). */
export function VisibilityZoneScale({ active, testID = 'moon-zone-scale' }: { active: VisibilityZone; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: theme.space[1] }} testID={testID}>
      {ZONES.map((zone) => {
        const selected = zone === active;
        return (
          <View
            accessibilityLabel={t(`moon.estimate.letters.${LETTER_KEY[zone]}`)}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={zone}
            style={{
              alignItems: 'center',
              backgroundColor: selected ? theme.colors.brand : theme.colors.fillSecondary,
              borderRadius: theme.radius.sm,
              flex: 1,
              height: 28,
              justifyContent: 'center',
            }}
            testID={`${testID}-${zone}`}
          >
            <UiText
              style={{ color: selected ? theme.colors.onBrand : theme.colors.inkMuted }}
              variant="caption"
              weight={600}
            >
              {t(`moon.estimate.letters.${LETTER_KEY[zone]}`)}
            </UiText>
          </View>
        );
      })}
    </View>
  );
}
