import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, SearchField } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

/** The Azkar search row (screens/, #AzkarSearch): a raised back button and the search field. */
export function AzkarSearchBar({
  value,
  onChangeText,
  onSubmit,
  onBack,
  autoFocus = true,
  testID = 'azkar-search-bar',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onBack: () => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <IconButton
        icon={BACK}
        label={t('azkar.browse.back')}
        mirrorInRtl
        onPress={onBack}
        testID={`${testID}-back`}
        variant="raised"
      />
      <View style={{ flex: 1 }}>
        <SearchField
          autoFocus={autoFocus}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          placeholder={t('azkar.search.placeholder')}
          testID={`${testID}-field`}
          value={value}
        />
      </View>
    </View>
  );
}
