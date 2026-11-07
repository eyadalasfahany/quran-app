import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/** The muted hint under the idle search: what the search ignores. Frame HadithCollSearch: 13 over 18, muted. */
export function HadithSearchHint({ testID = 'hadith-search-hint' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {t('hadith.search.hint')}
    </UiText>
  );
}
