import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { ReciterFilterChip } from './ReciterFilterChip';

export type ReciterFilterOption<T extends string> = { value: T; label: string; disabled?: boolean };

// The filter row (frame #Reciters): one choice at a time, wrapping onto a new line when it runs out of width.
export function ReciterFilterChips<T extends string>({
  label,
  options,
  selected,
  onSelect,
  testID = 'reciter-filter-chips',
}: {
  label: string;
  options: readonly ReciterFilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      testID={testID}
    >
      {options.map((option) => (
        <ReciterFilterChip
          disabled={option.disabled}
          key={option.value}
          label={option.label}
          onPress={() => {
            onSelect(option.value);
          }}
          selected={option.value === selected}
          testID={`${testID}-${option.value}`}
        />
      ))}
    </View>
  );
}
