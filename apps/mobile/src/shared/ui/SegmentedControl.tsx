import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

/** Segment min-height on the frames (quran-app-screens.html: min-height 40px). */
export const SEGMENT_MIN_HEIGHT = 40;
/** Top and bottom hit slop, so the hit area is 40 + 2 × 2 = 44 pt. */
export const SEGMENT_HIT_SLOP = 2;
/** Gap between a segment's leading glyph and its label (frame: gap 6px). */
export const SEGMENT_GAP = 6;

export type SegmentedOption<K extends string> = { key: K; label: string; leading?: ReactNode };

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
        backgroundColor: theme.colors.fillTrack,
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        gap: theme.space[1],
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
            hitSlop={{ bottom: SEGMENT_HIT_SLOP, top: SEGMENT_HIT_SLOP }}
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
              flexDirection: 'row',
              gap: SEGMENT_GAP,
              justifyContent: 'center',
              minHeight: SEGMENT_MIN_HEIGHT,
              paddingHorizontal: theme.space[2],
            })}
            testID={testID ? `${testID}-${option.key}` : undefined}
          >
            {option.leading}
            <UiText
              align="center"
              tone={selected ? 'ink' : 'muted'}
              variant="subhead"
              weight={selected ? 600 : 500}
            >
              {option.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}
