import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { SheetHeader } from '@/shared/ui';

import { EventListCard, type EventListItem } from './EventListCard';
import { useSeerahSheetClose, useSheetBottomPadding } from './SeerahSheet';

/**
 * The sheet for one crowded spot, or for «أخرى» (frame SeerahClusterSheet): its events in order of age. The hosting
 * SeerahSheet draws the card and the grabber; this is the header (the place, its count, close) and the rows, which scroll
 * with the sheet's drag (all of them reachable at the full detent) above the home indicator.
 */
export function SpotSheet({
  title,
  eventsLabel,
  rows,
  onRowPress,
  onClose,
  nearby = false,
  testID = 'seerah-spot-sheet',
}: {
  title: string;
  /** «١١ حدثًا». */
  eventsLabel: string;
  rows: readonly EventListItem[];
  onRowPress: (id: string) => void;
  onClose: () => void;
  /** The events of several places (a cluster, «أخرى»): the subtitle does not say «at this spot», and each row names its place. */
  nearby?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const close = useSeerahSheetClose(onClose);
  const bottom = useSheetBottomPadding();

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <View style={{ paddingBottom: 10, paddingHorizontal: theme.space[4], paddingTop: theme.space[2] }}>
        <SheetHeader
          closeLabel={t('seerah.close')}
          onClose={close}
          size="display"
          subtitle={t(nearby ? 'seerah.spot.subtitleNearby' : 'seerah.spot.subtitle', { events: eventsLabel })}
          testID={`${testID}-header`}
          title={title}
        />
      </View>
      <SheetScrollView contentContainerStyle={{ paddingBottom: bottom, paddingHorizontal: theme.space[4] }} testID={`${testID}-scroll`}>
        <EventListCard onRowPress={onRowPress} rows={rows} testID={`${testID}-rows`} />
      </SheetScrollView>
    </View>
  );
}
