import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, SearchField } from '@/shared/ui';

// The Search frame's top row: the field with a Cancel button on its trailing side, so search always has a way out.
// The placeholder is also the field's accessibility label, so it follows the scope (search.placeholderAzkar).
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onCancel,
  placeholder,
  testID = 'search-bar',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  placeholder?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <View style={{ flex: 1 }}>
        <SearchField
          autoFocus
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          placeholder={placeholder ?? t('search.placeholder')}
          testID="search-field"
          value={value}
        />
      </View>
      <Button label={t('search.cancel')} onPress={onCancel} variant="ghost" />
    </View>
  );
}
