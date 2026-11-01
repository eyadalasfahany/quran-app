import { useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/core/theme';
import type { IconName } from '@/shared/ui';

import { HomeTile } from './HomeTile';

// A tile's width when the row scrolls (quran-app-screens.html, #Main: 84 pt tiles in a row that runs past the edge).
const SCROLL_TILE_WIDTH = 84;

// Home's quick-access row (quran-app-screens.html, #Main). Tiles share the row equally while they fit (ADR 0017). Once
// they don't, as with five tiles on a phone, the row scrolls sideways at the frame's 84 pt tile width.
export function HomeTileRow({
  tiles,
  testID = 'home-tiles',
}: {
  tiles: { key: string; icon: IconName; label: string; onPress: () => void }[];
  testID?: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gap = theme.size.homeTileGridGap;
  const needed = tiles.length * SCROLL_TILE_WIDTH + Math.max(0, tiles.length - 1) * gap;
  // Until the row is measured, it lays out as a plain row; a width of zero never scrolls.
  const scrolls = width > 0 && needed > width;

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  if (scrolls) {
    return (
      <View onLayout={onLayout} testID={`${testID}-frame`}>
        <ScrollView
          contentContainerStyle={{ gap }}
          horizontal
          showsHorizontalScrollIndicator={false}
          testID={testID}
        >
          {tiles.map((tile) => (
            <View key={tile.key} style={{ width: SCROLL_TILE_WIDTH }}>
              <HomeTile icon={tile.icon} label={tile.label} onPress={tile.onPress} testID={`${testID}-${tile.key}`} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} testID={`${testID}-frame`}>
      <View style={{ flexDirection: 'row', gap }} testID={testID}>
        {tiles.map((tile) => (
          <HomeTile
            icon={tile.icon}
            key={tile.key}
            label={tile.label}
            onPress={tile.onPress}
            testID={`${testID}-${tile.key}`}
          />
        ))}
      </View>
    </View>
  );
}
