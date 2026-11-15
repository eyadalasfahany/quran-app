import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { IconButton } from './IconButton';
import { SearchField } from './SearchField';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * A search row (screens/, Azkar and Duas search): a raised back button and the search field. The labels come from the
 * caller, so each search screen names its own place and placeholder.
 */
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onBack,
  backLabel,
  placeholder,
  autoFocus = true,
  testID = 'search-bar',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onBack: () => void;
  /** The back button's accessibility label, in the caller's language. */
  backLabel: string;
  placeholder: string;
  autoFocus?: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <IconButton icon={BACK} label={backLabel} mirrorInRtl onPress={onBack} testID={`${testID}-back`} variant="raised" />
      <View style={{ flex: 1 }}>
        <SearchField
          autoFocus={autoFocus}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          placeholder={placeholder}
          testID={`${testID}-field`}
          value={value}
        />
      </View>
    </View>
  );
}
