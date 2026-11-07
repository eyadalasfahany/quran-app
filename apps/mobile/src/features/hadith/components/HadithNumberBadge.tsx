import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { formatHadithNumber } from '../format';

// Frames HadithCollBook (pill, 28 high) and HadithCollBooks (circle, 36 high).
const PILL_MIN = 28;
const CIRCLE_MIN = 36;
const PILL_TEXT = { fontSize: 13, lineHeight: 18 } as const;
const CIRCLE_TEXT = { fontSize: 14, lineHeight: 18 } as const;
const PILL_PADDING_X = 6;

/** A gold ring with a hadith or book number. Decorative: the row or card carries the label. */
export function HadithNumberBadge({
  number,
  size,
  testID = 'hadith-number-badge',
}: {
  number: string;
  size: 'pill' | 'circle';
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const isPill = size === 'pill';
  const min = isPill ? PILL_MIN : CIRCLE_MIN;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        borderColor: theme.colors.gold,
        borderRadius: min / 2,
        borderWidth: isPill ? theme.stroke.hairline : theme.stroke.marker,
        justifyContent: 'center',
        minHeight: min,
        minWidth: min,
        paddingHorizontal: isPill ? PILL_PADDING_X : 0,
      }}
      testID={testID}
    >
      <UiText
        style={isPill ? PILL_TEXT : CIRCLE_TEXT}
        testID={`${testID}-number`}
        tone={isPill ? 'muted' : 'brand'}
        variant="numeral"
      >
        {formatHadithNumber(number, locale)}
      </UiText>
    </View>
  );
}
