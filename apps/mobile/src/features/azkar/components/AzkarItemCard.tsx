import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import {
  arabicTextDirection,
  displayText,
  Icon,
  NumberMedallion,
  NumberRing,
  QuranText,
  UiText,
  useContrastColors,
} from '@/shared/ui';

import { AzkarCountChip } from './AzkarCountChip';

const CHECK = { ios: 'checkmark', android: 'check' } as const;

/**
 * One dhikr on a category or favourites list (screens/, #AzkarCategory and #AzkarFavorites): the number badge, a
 * two-line preview of the Arabic text, and at the end the sourced count chip, the completed mark, or a custom action
 * (the favourites bookmark). A list preview may clamp to two lines (tail ellipsis); the reader never does.
 * - `quranText`: the stored verse text in the Quran face. It is never clamped or ellipsized.
 * - `quranReference`: «سورة البقرة · ٢٥٥» in the UI font, a muted caption under the text when there is one, alone otherwise.
 * - `category`: a small muted line under everything (the favourites list's Duas topic, or the Azkar occasion).
 * - `badge`: `medallion` (the Azkar star) or `ring` (the round gold ring of the favourites list and the Duas list).
 * The card label reads the preview, the Quran text, then the reference.
 */
export function AzkarItemCard({
  number,
  preview,
  quranText = null,
  quranReference = null,
  category = null,
  badge = 'medallion',
  requiredCount,
  done = false,
  action,
  onPress,
  label,
  testID = 'azkar-item-card',
}: {
  number: number;
  preview: string | null;
  /** The verse text of a Quranic dua, as stored. Rendered in the Quran face, never truncated. */
  quranText?: string | null;
  /** «سورة البقرة · ٢٥٥» for an entry with a Quran passage: shown under the text, or alone without one. */
  quranReference?: string | null;
  /** The muted category line under the card's text, or null. */
  category?: string | null;
  badge?: 'medallion' | 'ring';
  /** The sourced count, or null. Never shown as 1 (ADR 0031 §6). */
  requiredCount: number | null;
  done?: boolean;
  action?: ReactNode;
  onPress: () => void;
  /** The card's accessibility label: the preview unless the caller names it. */
  label?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const shown = [preview, quranText, quranReference].filter((part): part is string => Boolean(part)).join(', ');
  const accessibleLabel =
    label ??
    `${formatNumber(number, locale)}${shown ? `, ${shown}` : ''}${category ? `, ${category}` : ''}${done ? `, ${t('azkar.browse.completed')}` : ''}`;
  const referenceIsCaption = preview !== null || quranText !== null;

  return (
    <Pressable
      accessibilityLabel={accessibleLabel}
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
      {badge === 'ring' ? (
        <NumberRing number={number} testID={`${testID}-medallion`} />
      ) : (
        <NumberMedallion number={number} testID={`${testID}-medallion`} />
      )}
      <View style={{ flex: 1, gap: theme.space[1] }}>
        {preview ? (
          <UiText ellipsizeMode="tail" numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
            {preview}
          </UiText>
        ) : null}
        {quranText ? (
          <QuranText align="start" testID={`${testID}-quran-text`} variant="quranResult">
            {quranText}
          </QuranText>
        ) : null}
        {quranReference ? (
          referenceIsCaption ? (
            <UiText numberOfLines={1} style={{ color: colors.inkMuted }} testID={`${testID}-quran-reference`} variant="caption">
              {quranReference}
            </UiText>
          ) : (
            <UiText numberOfLines={2} style={{ color: colors.inkMuted }} testID={`${testID}-quran-reference`} variant="body">
              {quranReference}
            </UiText>
          )
        ) : null}
        {category ? (
          <UiText numberOfLines={1} style={{ color: colors.inkMuted }} testID={`${testID}-category`} variant="caption">
            {category}
          </UiText>
        ) : null}
      </View>
      {action ?? null}
      {action === undefined && requiredCount !== null ? <AzkarCountChip count={requiredCount} /> : null}
      {action === undefined && done ? (
        <Icon color={theme.colors.brand} name={CHECK} size={20} testID={`${testID}-done`} />
      ) : null}
    </Pressable>
  );
}
