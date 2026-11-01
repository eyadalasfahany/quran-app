import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui';

/**
 * The «إتمام» action on the last unit once every unit is done: it records the whole session as complete, and the
 * reader then shows the completion screen. It sits where the counter sits, so the bottom row keeps its place.
 */
export function AzkarMarkCompleteButton({
  onPress,
  testID = 'azkar-mark-complete',
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <Button label={t('azkar.reader.markComplete')} onPress={onPress} size="regular" stretch testID={testID} variant="primary" />
  );
}
