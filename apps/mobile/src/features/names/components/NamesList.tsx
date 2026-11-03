import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { NameSummary } from '../data/model';
import { NameCard } from './NameCard';

export function NamesList({
  items,
  onOpen,
  onFavouritePress,
  testID = 'names-list',
}: {
  items: NameSummary[];
  onOpen: (slug: string) => void;
  onFavouritePress: (slug: string) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      {items.map((item) => (
        <NameCard
          item={item}
          key={item.nameSlug}
          onFavouritePress={() => onFavouritePress(item.nameSlug)}
          onPress={() => onOpen(item.nameSlug)}
          testID={`${testID}-item-${item.position}`}
        />
      ))}
    </View>
  );
}
