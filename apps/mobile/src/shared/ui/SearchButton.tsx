import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconButton } from './IconButton';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;

// The header's search control (quran-app-screens.html, #Main and #SurahIndex): a raised 44 pt disc
// with a hairline and a magnifier. It opens the search screen.
export function SearchButton({ testID }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <IconButton
      icon={MAGNIFIER}
      label={t('ui.search')}
      onPress={() => router.push('/search')}
      testID={testID}
      variant="raised"
    />
  );
}
