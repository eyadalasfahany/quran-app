import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, Icon, NumberMedallion, UiText, useContrastColors } from '@/shared/ui';

import { AzkarCountChip } from './AzkarCountChip';

const CHECK = { ios: 'checkmark', android: 'check' } as const;

/**
 * One dhikr on a category or favourites list (quran-app-screens.html, #AzkarCategory): the number medallion, a
 * two-line preview of the Arabic text, and at the end the sourced count chip, the completed mark, or a custom action
 * (the favourites bookmark). A list preview may clamp to two lines; the reader never does. An entry that opens with a
 * Quran passage has no text preview: it shows `quranReference` (surah and verses) in the UI font, never the ayah.
 */
export function AzkarItemCard({
  number,
  preview,
  quranReference = null,
  requiredCount,
  done = false,
  action,
  onPress,
  label,
  testID = 'azkar-item-card',
}: {
  number: number;
  preview: string | null;
  /** «سورة البقرة · ٢٥٥» for an entry that opens with a Quran passage, shown when there is no preview. */
  quranReference?: string | null;
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
  const shown = preview ?? quranReference;
  const accessibleLabel = label ?? `${formatNumber(number, locale)}${shown ? `, ${shown}` : ''}${done ? `, ${t('azkar.browse.completed')}` : ''}`;

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
      <NumberMedallion number={number} testID={`${testID}-medallion`} />
      <View style={{ flex: 1 }}>
        {preview ? (
          <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
            {preview}
          </UiText>
        ) : quranReference ? (
          <UiText numberOfLines={2} style={{ color: colors.inkMuted }} testID={`${testID}-quran-reference`} variant="body">
            {quranReference}
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
