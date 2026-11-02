import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

import { recommendedItems } from '../data/recommended-items';
import { RecommendedReminderItem } from './RecommendedReminderItem';

/**
 * The body of the recommended-set sheet (ADR 0034 amendment, 2 Nov 2026): what the set turns on, one primary button that
 * enables all of it, and «اختيار بنفسي» to close the sheet and keep the hub. Nothing is enabled until the primary button is
 * pressed.
 */
export function RecommendedRemindersContent({
  hasAzkar,
  onAccept,
  onChoose,
  testID = 'recommended-content',
}: {
  hasAzkar: boolean;
  onAccept: () => void;
  onChoose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <UiText tone="muted" variant="body">
        {t('reminders.recommended.intro')}
      </UiText>
      <View style={{ gap: theme.space[2] }}>
        {recommendedItems(hasAzkar).map((key) => (
          <RecommendedReminderItem key={key} label={t(`reminders.recommended.${key}`)} testID={`${testID}-item-${key}`} />
        ))}
      </View>
      {hasAzkar ? (
        <UiText tone="muted" variant="caption">
          {t('reminders.recommended.note')}
        </UiText>
      ) : null}
      <Button label={t('reminders.recommended.accept')} onPress={onAccept} stretch testID={`${testID}-accept`} variant="primary" />
      <Button label={t('reminders.recommended.choose')} onPress={onChoose} stretch testID={`${testID}-choose`} variant="secondary" />
    </View>
  );
}
