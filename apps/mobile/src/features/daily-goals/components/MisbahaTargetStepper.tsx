import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { IconButton, type IconName, ListRow, UiText } from '@/shared/ui';

import { MISBAHA_GOAL_MAX, MISBAHA_GOAL_MIN } from '../data/goals';

const MINUS: IconName = { ios: 'minus', android: 'remove' };
const PLUS: IconName = { ios: 'plus', android: 'add' };

/**
 * The misbaha goal's stepper (quran-app-screens.html, #DailyGoalsSheet «عدد التسبيحات»): the label at the reading start,
 * then «−», the value and «+». Each end stops at the range's limit, and the button there is disabled.
 */
export function MisbahaTargetStepper({
  label,
  value,
  onDecrease,
  onIncrease,
  testID = 'misbaha-target-stepper',
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <ListRow
      separator="line"
      testID={testID}
      title={label}
      trailing={
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <IconButton
            disabled={value <= MISBAHA_GOAL_MIN}
            icon={MINUS}
            label={t('dailyGoals.decrease')}
            onPress={onDecrease}
            testID={`${testID}-decrease`}
            variant="raised"
          />
          <UiText align="center" testID={`${testID}-value`} variant="subhead" weight={600}>
            {formatNumber(value, locale)}
          </UiText>
          <IconButton
            disabled={value >= MISBAHA_GOAL_MAX}
            icon={PLUS}
            label={t('dailyGoals.increase')}
            onPress={onIncrease}
            testID={`${testID}-increase`}
            variant="raised"
          />
        </View>
      }
    />
  );
}
