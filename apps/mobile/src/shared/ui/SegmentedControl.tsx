import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

export type SegmentedOption<K extends string> = { key: K; label: string };

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  label,
  testID,
}: {
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
  testID?: string;
}) {
  const theme = useTheme();

  const select = (key: K) => {
    if (key === value) {
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(key);
  };

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="tablist"
      style={{
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        padding: theme.space[1],
      }}
      testID={testID}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => select(option.key)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected
                ? theme.colors.surfaceRaised
                : pressed
                  ? theme.colors.glassSelected
                  : 'transparent',
              borderRadius: theme.radius.pill,
              boxShadow: selected ? theme.shadows.raised : undefined,
              flex: 1,
              justifyContent: 'center',
              minHeight: theme.size.touchTarget,
              paddingHorizontal: theme.space[2],
            })}
            testID={testID ? `${testID}-${option.key}` : undefined}
          >
            <UiText align="center" tone={selected ? 'brand' : 'ink'} variant="subhead">
              {option.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}
