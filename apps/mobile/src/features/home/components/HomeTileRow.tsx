import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { IconName } from '@/shared/ui';

import { HomeTile } from './HomeTile';

// Home's quick-access row (quran-app-screens.html, #Main). Tiles share the row equally.
export function HomeTileRow({
  tiles,
  testID = 'home-tiles',
}: {
  tiles: { key: string; icon: IconName; label: string; onPress: () => void }[];
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.size.homeTileGridGap }} testID={testID}>
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
  );
}
