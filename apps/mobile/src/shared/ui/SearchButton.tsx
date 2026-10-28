import { useTranslation } from 'react-i18next';

import { IconButton } from './IconButton';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;

export function SearchButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();

  return (
    <IconButton
      icon={MAGNIFIER}
      label={t('ui.search')}
      onPress={onPress}
      testID={testID}
      variant="raised"
    />
  );
}
