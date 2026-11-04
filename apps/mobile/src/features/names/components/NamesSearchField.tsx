import { useTranslation } from 'react-i18next';

import { SearchField } from '@/shared/ui';

export function NamesSearchField({
  value,
  onChangeText,
  testID = 'names-search-field',
}: {
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SearchField
      onChangeText={onChangeText}
      onSubmit={onChangeText}
      placeholder={t('names.list.searchPlaceholder')}
      testID={testID}
      value={value}
    />
  );
}
