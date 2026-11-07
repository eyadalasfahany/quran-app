import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/** The source line under the collections list. It is UI chrome, not hadith text, so it is centred. */
export function HadithListCredit({ testID = 'hadith-list-credit' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <UiText align="center" testID={testID} tone="muted" variant="label" weight={400}>
      {t('hadith.list.credit')}
    </UiText>
  );
}
