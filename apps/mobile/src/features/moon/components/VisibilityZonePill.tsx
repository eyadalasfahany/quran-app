import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { VisibilityZone } from '../data/crescent';

const LETTER_KEY = { A: 'a', B: 'b', C: 'c', D: 'd' } as const;

/** The brand colour at a tenth of its strength, from the theme's hex value (the frame's «المنطقة د» pill). */
function brandTint(hex: string, fallback: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return fallback;
  }
  const value = match[1]!;
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, 0.1)`;
}

/** The zone name at the end of the estimate card's header, «المنطقة د» / "Zone D". */
export function VisibilityZonePill({ zone, testID = 'moon-zone-pill' }: { zone: VisibilityZone; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: brandTint(theme.colors.brand, theme.colors.fillSecondary),
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.space[3],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <UiText style={{ color: theme.colors.brand }} variant="caption" weight={500}>
        {t('moon.estimate.zone', { letter: t(`moon.estimate.letters.${LETTER_KEY[zone]}`) })}
      </UiText>
    </View>
  );
}
