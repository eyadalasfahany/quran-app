import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, UiText, useContrastColors } from '@/shared/ui';

import { DuasCardNumber } from './DuasCardNumber';

type CardCommon = {
  /** The card's position in the category, from 1. */
  number: number;
  onPress: () => void;
  testID?: string;
};

/**
 * One dua in a Duas category (screens/, #DuasCategory), with the Azkar card anatomy: the number circle, then the dua
 * text, clamped to two lines. No source line and no chevron (developer, 15 Nov 2026). Three variants:
 * - `hisn`: the Azkar preview in Amiri.
 * - `hadith`: the HadeethEnc title in Amiri.
 * - `quran`: the surah and verses only, in the UI font. The Quran text is never shown here.
 * The card's label reads the preview (or the reference) after its position.
 */
export type DuasCategoryCardProps = CardCommon &
  (
    | { kind: 'hisn'; preview: string | null }
    | { kind: 'hadith'; preview: string }
    | { kind: 'quran'; reference: string }
  );

export function DuasCategoryCard(props: DuasCategoryCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const { number, onPress, testID = 'duas-category-card' } = props;
  const title = props.kind === 'quran' ? props.reference : (props.preview ?? '');
  const label = title === '' ? formatNumber(number, locale) : t('common.a11yPair', { label: formatNumber(number, locale), title });

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.size.blockGap,
      })}
      testID={testID}
    >
      <DuasCardNumber number={number} testID={`${testID}-number`} />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        {props.kind === 'quran' ? (
          <UiText numberOfLines={2} testID={`${testID}-reference`} variant="body" weight={600}>
            {props.reference}
          </UiText>
        ) : props.preview ? (
          <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
            {props.preview}
          </UiText>
        ) : null}
      </View>
    </Pressable>
  );
}
