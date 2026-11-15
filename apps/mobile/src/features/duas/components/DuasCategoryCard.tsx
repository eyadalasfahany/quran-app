import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, Icon, UiText, useContrastColors } from '@/shared/ui';

import { DuasCardNumber } from './DuasCardNumber';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

type CardCommon = {
  /** The card's position in the category, from 1. */
  number: number;
  onPress: () => void;
  testID?: string;
};

/**
 * One dua in a Duas category (screens/, #DuasCategory). Three variants, one card family:
 * - `hisn`: the chapter title, the Azkar preview clamped to two lines, and the source with its book number.
 * - `hadith`: the HadeethEnc title clamped to two lines.
 * - `quran`: the surah and verses only. The Quran text is never shown here.
 * The card's label reads the chapter title (or the preview, or the reference) after its position.
 */
export type DuasCategoryCardProps = CardCommon &
  (
    | { kind: 'hisn'; chapterTitle: string | null; preview: string | null; caption: string }
    | { kind: 'hadith'; preview: string }
    | { kind: 'quran'; reference: string }
  );

export function DuasCategoryCard(props: DuasCategoryCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const { number, onPress, testID = 'duas-category-card' } = props;
  const title =
    props.kind === 'hisn' ? (props.chapterTitle ?? props.preview ?? '') : props.kind === 'hadith' ? props.preview : props.reference;
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
        {props.kind === 'hisn' ? (
          <>
            {props.chapterTitle ? (
              <UiText tone="muted" variant="caption" weight={600}>
                {props.chapterTitle}
              </UiText>
            ) : null}
            {props.preview ? (
              <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
                {props.preview}
              </UiText>
            ) : null}
            <UiText tone="muted" variant="label" weight={400}>
              {props.caption}
            </UiText>
          </>
        ) : null}
        {props.kind === 'hadith' ? (
          <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
            {props.preview}
          </UiText>
        ) : null}
        {props.kind === 'quran' ? (
          <UiText variant="headline" weight={600}>
            {props.reference}
          </UiText>
        ) : null}
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} />
    </Pressable>
  );
}
