import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Button, Chip, IconButton, type IconName, UiText } from '@/shared/ui';

import {
  OFFSET_MAX_MINUTES,
  OFFSET_MIN_MINUTES,
  OFFSET_STEP_MINUTES,
  REMINDER_PRAYERS,
  type ReminderPrayer,
} from '../reminders/schedule';

const MINUS: IconName = { ios: 'minus', android: 'remove' };
const PLUS: IconName = { ios: 'plus', android: 'add' };

/**
 * The prayer and offset of a prayer-relative reminder: five prayer chips and a stepper from 0 to 120 minutes in 5-minute
 * steps. With no location it says so and offers the Salah screen, and no prayer can be fired without coordinates.
 */
export function PrayerOffsetPicker({
  prayer,
  offsetMinutes,
  needsLocation,
  onPrayerChange,
  onOffsetChange,
  onOpenLocation,
  testID = 'azkar-prayer-offset',
}: {
  prayer: ReminderPrayer | null;
  offsetMinutes: number | null;
  needsLocation: boolean;
  onPrayerChange: (prayer: ReminderPrayer) => void;
  onOffsetChange: (minutes: number) => void;
  onOpenLocation: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const current = offsetMinutes ?? OFFSET_MIN_MINUTES;
  // «عند الصلاة» at zero, otherwise «بعد ١٠ دقائق»: the plural follows the locale.
  const offsetText =
    current === 0
      ? t('azkar.reminders.offsetAt')
      : t('azkar.reminders.offsetAfter', { count: current, number: formatNumber(current, locale) });

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      {needsLocation ? (
        <View style={{ gap: theme.space[2] }} testID={`${testID}-location`}>
          <UiText accessibilityRole="text" tone="muted" variant="caption">
            {t('azkar.reminders.needsLocation')}
          </UiText>
          <Button
            label={t('azkar.reminders.setLocation')}
            onPress={onOpenLocation}
            size="small"
            testID={`${testID}-set-location`}
            variant="secondary"
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {REMINDER_PRAYERS.map((name) => (
          <Chip
            key={name}
            label={t(`home.salah.${name}`)}
            layout="sheet"
            onPress={() => onPrayerChange(name)}
            role="radio"
            selected={name === prayer}
            testID={`${testID}-prayer-${name}`}
          />
        ))}
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <UiText accessibilityRole="text" variant="subhead">
          {t('azkar.reminders.offset')}
        </UiText>
        <View style={{ flex: 1 }} />
        <IconButton
          disabled={current <= OFFSET_MIN_MINUTES}
          icon={MINUS}
          label={t('azkar.reminders.offsetLess')}
          onPress={() => onOffsetChange(Math.max(OFFSET_MIN_MINUTES, current - OFFSET_STEP_MINUTES))}
          testID={`${testID}-less`}
          variant="track"
        />
        <UiText testID={`${testID}-value`} variant="subhead" weight={600}>
          {offsetText}
        </UiText>
        <IconButton
          disabled={current >= OFFSET_MAX_MINUTES}
          icon={PLUS}
          label={t('azkar.reminders.offsetMore')}
          onPress={() => onOffsetChange(Math.min(OFFSET_MAX_MINUTES, current + OFFSET_STEP_MINUTES))}
          testID={`${testID}-more`}
          variant="track"
        />
      </View>
    </View>
  );
}
