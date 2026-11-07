import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { isPresetTarget, SIBHA_TARGET_PRESETS } from '../data/model';

import { SibhaTargetChip } from './SibhaTargetChip';

/** A chip's value: a preset target, `custom` for the number sheet, or `none` for no limit («بلا حد»). */
export type SibhaChoice = number | 'custom' | 'none';

/**
 * The target row (screens/, #Sibha): 33, 99, 100, «مخصص» and «بلا حد». The chips sit in content order, so
 * the first preset is at the reading start. No target (null) selects «بلا حد», and a custom target selects «مخصص».
 */
export function SibhaTargetChips({
  target,
  onChoose,
  testID = 'sibha-target-chips',
}: {
  target: number | null;
  onChoose: (choice: SibhaChoice) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const customSelected = target !== null && !isPresetTarget(target);

  return (
    <View
      accessibilityLabel={t('sibha.target')}
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2], justifyContent: 'center' }}
      testID={testID}
    >
      {SIBHA_TARGET_PRESETS.map((preset) => (
        <SibhaTargetChip
          key={preset}
          label={formatNumber(preset, locale)}
          onPress={() => onChoose(preset)}
          selected={target === preset}
          testID={`${testID}-${preset}`}
        />
      ))}
      <SibhaTargetChip
        label={t('sibha.targetCustom')}
        onPress={() => onChoose('custom')}
        selected={customSelected}
        testID={`${testID}-custom`}
      />
      <SibhaTargetChip
        label={t('sibha.targetNone')}
        onPress={() => onChoose('none')}
        selected={target === null}
        testID={`${testID}-none`}
      />
    </View>
  );
}
