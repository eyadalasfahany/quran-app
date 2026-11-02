import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { Card, Icon, ListRow, UiText } from '@/shared/ui';

const ICON = { ios: 'slider.horizontal.3', android: 'tune' } as const;

/** The adjustment entry under the calendar (quran-app-screens.html, #HijriCalendar): a raised card with the current value. */
export function HijriAdjustRow({
  valueLabel,
  onPress,
  testID = 'hijri-adjust-row',
}: {
  /** The current adjustment, already signed and in the locale's digits (for example «+١ يوم»). */
  valueLabel: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Card padding={1} radius="lg" testID={testID}>
      <ListRow
        chevron
        leading={<Icon color={theme.colors.brand} name={ICON} size={22} />}
        onPress={onPress}
        testID={`${testID}-press`}
        title={t('hijri.adjust.row')}
        trailing={
          <UiText testID={`${testID}-value`} tone="muted" variant="subhead">
            {valueLabel}
          </UiText>
        }
      />
    </Card>
  );
}
