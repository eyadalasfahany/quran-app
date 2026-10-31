import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui';

/**
 * The action for a dhikr with no sourced count: one tap marks it done. Never a «١ من ١». Once done it stays
 * visible and disabled, so the reader keeps its place.
 */
export function AzkarDoneButton({
  completed,
  onPress,
  testID = 'azkar-done-button',
}: {
  completed: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <Button
      disabled={completed}
      label={t('azkar.reader.done')}
      onPress={onPress}
      size="regular"
      stretch
      testID={testID}
      variant="primary"
    />
  );
}
