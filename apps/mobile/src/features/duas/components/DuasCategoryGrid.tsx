import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';
import { AzkarTopicTile } from '@/features/azkar/components/AzkarTopicTile';

export type DuasCategoryGridItem = {
  id: string;
  name: string;
  /** The count line under the name, «٢٨ دعاءً». */
  countText: string;
  onPress: () => void;
};

/**
 * The «التصنيفات» block on Duas home (screens/, #DuasHomeCategories): the Azkar section title, an optional toggle at its
 * end («عرض الكل ٢١» / «عرض أقل»), then the tiles in two columns with Azkar's topic tile. The screen decides which tiles
 * are shown. An odd last tile keeps its half of the row, as the frame draws it.
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
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <AzkarSectionTitle testID={`${testID}-heading`} title={heading} />
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
              paddingHorizontal: theme.space[1],
            })}
            testID={`${testID}-toggle`}
          >
            <UiText style={{ color: colors.brand }} variant="subhead" weight={600}>
              {toggle.label}
            </UiText>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: theme.space[3] }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.space[3] }}>
            {row.map((item) => (
              <AzkarTopicTile
                countText={item.countText}
                key={item.id}
                onPress={item.onPress}
                testID={`${testID}-tile-${item.id}`}
                title={item.name}
              />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
