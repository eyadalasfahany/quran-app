import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { DuasCategoryTile } from './DuasCategoryTile';

export type DuasCategoryGridItem = {
  id: string;
  name: string;
  caption: string;
  onPress: () => void;
};

/**
 * The «التصنيفات» block on Duas home (screens/, #DuasHomeCategories): a heading, an optional toggle link at the end
 * of it («عرض الكل ٢١» / «عرض أقل»), then the tiles in two columns. The screen decides which tiles are shown.
 */
export function DuasCategoryGrid({
  heading,
  items,
  toggle,
  testID = 'duas-category-grid',
}: {
  heading: string;
  items: readonly DuasCategoryGridItem[];
  toggle?: { label: string; expanded: boolean; onPress: () => void };
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const rows: DuasCategoryGridItem[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.space[1] }}>
        <UiText accessibilityRole="header" testID={`${testID}-heading`} tone="muted" variant="subhead" weight={600}>
          {heading}
        </UiText>
        {toggle ? (
          <Pressable
            accessibilityLabel={toggle.label}
            accessibilityRole="button"
            accessibilityState={{ expanded: toggle.expanded }}
            onPress={toggle.onPress}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: theme.size.touchTarget,
              opacity: pressed ? theme.opacity.pressed : 1,
            })}
            testID={`${testID}-toggle`}
          >
            <UiText style={{ color: colors.brand }} variant="subhead" weight={600}>
              {toggle.label}
            </UiText>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: theme.size.homeTileGridGap }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.size.homeTileGridGap }}>
            {row.map((item) => (
              <DuasCategoryTile
                caption={item.caption}
                key={item.id}
                name={item.name}
                onPress={item.onPress}
                testID={`${testID}-tile-${item.id}`}
              />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
