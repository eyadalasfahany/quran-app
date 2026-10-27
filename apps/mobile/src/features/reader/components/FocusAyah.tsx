import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { AyahMarker } from '@/shared/ui';
import { quranText } from '@/shared/ui/textStyles';
import { useContrastColors } from '@/shared/ui/useContrastColors';

const highlightFill = {
  gold: 'highlightGold',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  rose: 'highlightRose',
} as const;

export function FocusAyah({
  verseNumber,
  textUthmani,
  textImlaei,
  blockHeight,
  fontScale = 1,
  selected = false,
  recited = false,
  highlightColor = null,
  onPress,
  onLongPress,
  onOpenActions,
  testID,
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  blockHeight: number;
  fontScale?: number;
  selected?: boolean;
  recited?: boolean;
  highlightColor?: HighlightColor | null;
  onPress?: () => void;
  onLongPress?: () => void;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const active = selected || recited;
  const labelText = textImlaei ?? textUthmani;
  const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) });
  const accessibilityLabel =
    highlightColor === null
      ? `${labelText} ${ayahLabel}`
      : `${labelText} ${ayahLabel} ${t(`ui.highlight.${highlightColor}`)}`;

  const quranBackground = active
    ? colors.highlightActive
    : highlightColor === null
      ? 'transparent'
      : colors[highlightFill[highlightColor]];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={{
        alignItems: 'center',
        height: blockHeight,
        justifyContent: 'center',
        paddingHorizontal: theme.space[5],
      }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', gap: theme.space[4], maxWidth: '100%' }}>
        <View
          style={{
            backgroundColor: quranBackground,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.space[2],
            paddingVertical: theme.space[2],
          }}
        >
          <Text
            allowFontScaling={false}
            style={[quranText('quranFocus', fontScale), { color: theme.colors.ink, textAlign: 'center', writingDirection: 'rtl' }]}
          >
            {textUthmani}
          </Text>
        </View>
        <AyahMarker
          active={active}
          fontScale={fontScale}
          number={verseNumber}
          onPress={onOpenActions}
          testID={testID ? `${testID}-marker` : undefined}
        />
      </View>
    </Pressable>
  );
}
