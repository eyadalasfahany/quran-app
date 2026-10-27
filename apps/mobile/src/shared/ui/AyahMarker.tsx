import { size as sizeTokens } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { AyahEndMark } from './AyahEndMark';

export const FOCUS_MARKER_SIZE = sizeTokens.focusMarker;

// A standalone ayah marker (Reading and Focus): the end-of-ayah ornament as its own control,
// with a 44 pt target. Inside a Mushaf line use AyahEndMark directly.
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
        justifyContent: 'center',
        marginHorizontal: theme.space[1],
        minHeight: size,
      }}
      testID={testID}
    >
      <AyahEndMark active={active} decorative number={number} size={size} />
    </Pressable>
  );
}
