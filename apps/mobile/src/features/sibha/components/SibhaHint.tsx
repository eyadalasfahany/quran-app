import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/**
 * The line at the foot of the misbaha (screens/, #Sibha): «اضغط في أي مكان للعدّ». It is decorative for
 * screen readers, because the counter button carries the same instruction as its hint.
 */
export function SibhaHint({ testID = 'sibha-hint' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <UiText align="center" importantForAccessibility="no" testID={testID} tone="muted" variant="caption">
      {t('sibha.hint')}
    </UiText>
  );
}
