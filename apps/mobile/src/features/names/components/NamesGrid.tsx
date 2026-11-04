import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { NameSummary } from '../data/model';
import { NameCard } from './NameCard';

export function NamesGrid({
  items,
  onOpen,
  onFavouritePress,
  testID = 'names-grid',
}: {
  items: NameSummary[];
  onOpen: (slug: string) => void;
  onFavouritePress: (slug: string) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const pairs: NameSummary[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      {pairs.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', gap: theme.space[3] }}>
          {row.map((item) => (
            <View key={item.nameSlug} style={{ flex: 1 }}>
              <NameCard
                item={item}
                onFavouritePress={() => onFavouritePress(item.nameSlug)}
                onPress={() => onOpen(item.nameSlug)}
                testID={`${testID}-item-${item.position}`}
              />
            </View>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
