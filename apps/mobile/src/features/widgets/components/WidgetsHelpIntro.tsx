import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/** Muted line under the title: what widgets show and what they never include (ADR 0035 §1). */
export function WidgetsHelpIntro({ testID = 'widgets-help-intro' }: { testID?: string }) {
  const { t } = useTranslation();
  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {t('widgetsHelp.intro')}
    </UiText>
  );
}
