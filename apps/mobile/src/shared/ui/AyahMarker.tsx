import { size as sizeTokens } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { displayText } from './textStyles';

export const FOCUS_MARKER_SIZE = sizeTokens.focusMarker;

export function AyahMarker({
  number,
  active = false,
  onPress,
  fontScale = 1,
  markerSize = sizeTokens.ayahMarker,
  testID,
}: {
  number: number;
  active?: boolean;
  onPress?: () => void;
  fontScale?: number;
  markerSize?: number;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const size = markerSize * fontScale;
  const slop = Math.max(0, (theme.size.touchTarget - size) / 2);

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
        borderWidth: theme.stroke.marker,
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
