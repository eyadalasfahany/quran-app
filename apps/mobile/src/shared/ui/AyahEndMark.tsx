import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { quranFonts, useQuranFont, useTheme } from '@/core/theme';

// The brackets and digits carry no strong direction, so standing alone they would lay out left to right
// and swap sides. A leading right-to-left mark sets the direction on iOS and Android alike.
const RTL_MARK = '\u200F';
// Amiri Quran's ornate parentheses, in logical order for right-to-left text.
export const ORNATE_OPEN = '\uFD3F';
export const ORNATE_CLOSE = '\uFD3E';
// The ornaments reach above and below the digits, so a standalone mark needs a taller line.
const MARK_LINE_HEIGHT = 1.5;

// The characters the mark draws, in order: the direction mark, the open ornament, the Arabic-Indic digits and
// the close ornament. The reader counts a recited ayah's offsets with this, so it matches what renders.
export function ayahEndMarkText(number: number): string {
  return `${RTL_MARK}${ORNATE_OPEN}${formatNumber(number, 'ar')}${ORNATE_CLOSE}`;
}

// The end-of-ayah ornament: Amiri Quran's ornate parentheses around the Arabic-Indic number.
// Inline in a Quran line it is a Text span that flows with the ayahs and takes the line's size;
// standing alone (AyahMarker) it takes a size. The app draws it; it is never part of the stored ayah text.
export function AyahEndMark({
  number,
  active = false,
  khatmaMarked = false,
  onPress,
  size,
  decorative = false,
  testID,
}: {
  number: number;
  active?: boolean;
  /** Gold ornament when this ayah is the khatma marker and not active. */
  khatmaMarked?: boolean;
  onPress?: () => void;
  /** Font size when the mark stands alone; inline it inherits the line's. */
  size?: number;
  /** Hidden from screen readers when the control around it carries the label. */
  decorative?: boolean;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const font = useQuranFont();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const accessibility = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : {
        accessibilityLabel: t('ui.ayahNumber', { number: formatNumber(number, locale) }),
        accessibilityRole: onPress ? ('button' as const) : ('text' as const),
        accessibilityState: onPress ? { selected: active } : undefined,
      };

  const markerGold = !active && khatmaMarked;

  return (
    <Text
      {...accessibility}
      allowFontScaling={size === undefined ? undefined : false}
      onPress={onPress}
      style={[
        {
          color: active ? theme.colors.brand : theme.colors.gold,
          fontFamily: quranFonts[font].family,
        },
        size === undefined ? null : { fontSize: size, lineHeight: Math.round(size * MARK_LINE_HEIGHT) },
      ]}
      testID={testID}
    >
      {RTL_MARK}
      {ORNATE_OPEN}
      <Text style={{ color: active ? theme.colors.brand : markerGold ? theme.colors.gold : theme.colors.ink }}>
        {formatNumber(number, 'ar')}
      </Text>
      {ORNATE_CLOSE}
    </Text>
  );
}
