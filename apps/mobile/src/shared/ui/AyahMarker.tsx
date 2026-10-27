import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { displayText } from './textStyles';

const SIZE = 28;
const MIN_TARGET = 44;

// The app-drawn ayah number (Reading, Focus and non-QCF Mushaf). Page-exact QCF pages use the font's
// own marker glyph, which is never recoloured.
export function AyahMarker({
  number,
  active = false,
  onPress,
  fontScale = 1,
  testID,
}: {
  number: number;
  // Recited or selected: a filled brand marker, never gold (ADR 0012).
  active?: boolean;
  // Opens ayah actions.
  onPress?: () => void;
  // The reader's Quran font scale, so the marker keeps pace with the ayah text.
  fontScale?: number;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const size = SIZE * fontScale;
  const slop = Math.max(0, (MIN_TARGET - size) / 2);

  return (
    <Pressable
      accessibilityLabel={t('ui.ayahNumber', { number: formatNumber(number, locale) })}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: active } : undefined}
      disabled={!onPress}
      hitSlop={slop}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? theme.colors.brand : 'transparent',
        borderColor: active ? theme.colors.brand : theme.colors.gold,
        borderRadius: size / 2,
        borderWidth: 1.25,
        height: size,
        justifyContent: 'center',
        marginHorizontal: theme.space[1],
        width: size,
      }}
      testID={testID}
    >
      <Text
        allowFontScaling={false}
        style={[displayText('numeral', fontScale), { color: active ? theme.colors.onBrand : theme.colors.ink }]}
      >
        {formatNumber(number, 'ar')}
      </Text>
    </Pressable>
  );
}
