import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { highlightColors, type HighlightColor } from './highlight';
import { HighlightSwatch } from './HighlightSwatch';
import { UiText } from './UiText';

// Ayah actions frame (screens/): the highlight row's padding and swatch gap.
// No space token matches these, so they stay local.
const ROW_PADDING_VERTICAL = 6;
const ROW_PADDING_HORIZONTAL = 14;
const SWATCH_GAP = 6;

export function HighlightRow({
  label,
  selected,
  onSelect,
  testID,
}: {
  label: string;
  selected: HighlightColor | null;
  onSelect: (color: HighlightColor) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.tile,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: ROW_PADDING_HORIZONTAL,
        paddingVertical: ROW_PADDING_VERTICAL,
      }}
      testID={testID}
    >
      <UiText variant="subhead" weight={500}>
        {label}
      </UiText>
      <View accessibilityLabel={label} style={{ flexDirection: 'row', gap: SWATCH_GAP }}>
        {highlightColors.map((color) => (
          <HighlightSwatch
            color={color}
            key={color}
            onPress={() => onSelect(color)}
            selected={selected === color}
            testID={testID ? `${testID}-${color}` : undefined}
          />
        ))}
      </View>
    </View>
  );
}
