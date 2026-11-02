import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/** Credits the Hisn and HadeethEnc sources on Duas home (ADR 0046). */
export function DuasAttributionLine({ testID = 'duas-attribution-line' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {t('duas.home.attribution')}
    </UiText>
  );
}
