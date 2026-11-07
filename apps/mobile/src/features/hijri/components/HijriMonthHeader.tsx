import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, IconButton, UiText } from '@/shared/ui';

const PREVIOUS = { ios: 'chevron.left', android: 'chevron_left' } as const;
const NEXT = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * The month title with previous and next (screens/, #HijriCalendar): the Amiri month and year, the
 * Gregorian range under it, and a «اليوم» return when the calendar is away from today.
 */
export function HijriMonthHeader({
  title,
  subtitle,
  onPrevious,
  onNext,
  onToday,
  testID = 'hijri-month-header',
}: {
  title: string;
  subtitle: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Shown only when the calendar is away from today. */
  onToday?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[1] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton
          icon={PREVIOUS}
          label={t('hijri.previousMonth')}
          mirrorInRtl
          onPress={onPrevious}
          testID={`${testID}-previous`}
          variant="plain"
        />
        <View style={{ alignItems: 'center', flex: 1, gap: theme.space[1] }}>
          <UiText accessibilityRole="header" testID={`${testID}-title`} variant="title">
            {title}
          </UiText>
          <UiText testID={`${testID}-subtitle`} tone="muted" variant="caption">
            {subtitle}
          </UiText>
        </View>
        <IconButton
          icon={NEXT}
          label={t('hijri.nextMonth')}
          mirrorInRtl
          onPress={onNext}
          testID={`${testID}-next`}
          variant="plain"
        />
      </View>
      {onToday ? (
        <View style={{ alignItems: 'center' }}>
          <Button label={t('hijri.today')} onPress={onToday} size="small" testID={`${testID}-today`} variant="ghost" />
        </View>
      ) : null}
    </View>
  );
}
