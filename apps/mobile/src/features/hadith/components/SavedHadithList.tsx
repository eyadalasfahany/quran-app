import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { useSavedHadithItems, type SavedHadithItem } from '../personal';
import { toSavedRowData } from '../saved-row-data';
import { HadithStateView } from './HadithStateView';
import { SavedHadithRow } from './SavedHadithRow';
import { UnverifiedNotice } from './UnverifiedNotice';

/**
 * The saved hadith list, newest first, or its empty state. The caller owns the scroll view: this draws none,
 * so it sits in a screen's own list (frames HadithCollSaved, HadithCollSavedEmpty, HadithCollSavedUnverified).
 */
export function SavedHadithList({
  onOpen,
  onEmptyAction,
  testID,
}: {
  onOpen: (item: SavedHadithItem) => void;
  onEmptyAction: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const items = useSavedHadithItems();
  const anyUnverified = items.some((item) => item.saved.unverified);

  if (items.length === 0) {
    return <HadithStateView kind="savedEmpty" onAction={onEmptyAction} testID={`${testID}-empty`} />;
  }

  return (
    <View style={{ gap: theme.space[3] }}>
      {anyUnverified ? <UnverifiedNotice testID={`${testID}-notice`} /> : null}
      {items.map((item, index) => (
        <SavedHadithRow
          key={`${item.saved.collectionSlug}:${item.saved.hadithNumber}:${index}`}
          onPress={() => onOpen(item)}
          saved={toSavedRowData(item)}
          testID={`${testID}-row-${index}`}
        />
      ))}
    </View>
  );
}
