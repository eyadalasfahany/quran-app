import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, QuranText, UiText, useContrastColors } from '@/shared/ui';

import { DuasCardNumber } from './DuasCardNumber';

type CardCommon = {
  /** The card's position in the category, from 1. */
  number: number;
  onPress: () => void;
  testID?: string;
};

/**
 * One dua in a Duas category (screens/, #DuasCategory), with the Azkar card anatomy: the same padding, gap and minimum
 * height as `AzkarItemCard`, the gold number ring, then the text. Text clamps to two lines with a tail ellipsis; Quran
 * text never clamps. No source line and no chevron (developer, 15 Nov 2026). Three variants:
 * - `hisn`: the recited Azkar preview in Amiri.
 * - `hadith`: the HadeethEnc title in Amiri.
 * - `quran`: the stored verse text in the Quran face, then the «سورة … · …» reference as a muted caption.
 * The card's label reads the preview (or the Quran text and reference) after its position.
 */
export type DuasCategoryCardProps = CardCommon &
  (
    | { kind: 'hisn'; preview: string | null }
    | { kind: 'hadith'; preview: string }
    | { kind: 'quran'; reference: string; text?: string | null }
  );

export function DuasCategoryCard(props: DuasCategoryCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const { number, onPress, testID = 'duas-category-card' } = props;
  const title =
    props.kind === 'quran'
      ? [props.text, props.reference].filter((part): part is string => Boolean(part)).join(', ')
      : (props.preview ?? '');
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
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <DuasCardNumber number={number} testID={`${testID}-number`} />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        {props.kind === 'quran' ? (
          <>
            {props.text ? (
              <QuranText align="start" testID={`${testID}-text`} variant="quranResult">
                {props.text}
              </QuranText>
            ) : null}
            <UiText numberOfLines={1} style={{ color: colors.inkMuted }} testID={`${testID}-reference`} variant="caption">
              {props.reference}
            </UiText>
          </>
        ) : props.preview ? (
          <UiText
            ellipsizeMode="tail"
            numberOfLines={2}
            style={[displayText('dhikrList'), arabicTextDirection]}
            variant="body"
          >
            {props.preview}
          </UiText>
        ) : null}
      </View>
    </Pressable>
  );
}
