import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetHeader } from '@/shared/ui';

import { EventListCard, type EventListItem } from './EventListCard';

/**
 * The small sheet for one crowded spot (frame SeerahClusterSheet): more than six events at the deepest zoom open here, in
 * order of age. It is the only list the map shows. The sheet's own transparent modal and detents belong to the screen; this
 * is the card: a grabber, the place and its count, a close button and the rows.
 */
export function SpotSheet({
  title,
  eventsLabel,
  rows,
  onRowPress,
  onClose,
  testID = 'seerah-spot-sheet',
}: {
  title: string;
  /** «١١ حدثًا». */
  eventsLabel: string;
  rows: readonly EventListItem[];
  onRowPress: (id: string) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        gap: theme.space[3],
        maxHeight: '60%',
        paddingBottom: theme.space[6],
        paddingHorizontal: theme.space[4],
        paddingTop: theme.space[2],
      }}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          alignSelf: 'center',
          backgroundColor: theme.colors.lineStrong,
          borderRadius: theme.size.grabberRadius,
          height: theme.size.grabberHeight,
          width: theme.size.grabberWidth,
        }}
        testID={`${testID}-grabber`}
      />
      <SheetHeader
        closeLabel={t('seerah.close')}
        onClose={onClose}
        size="large"
        subtitle={t('seerah.spot.subtitle', { events: eventsLabel })}
        testID={`${testID}-header`}
        title={title}
      />
      <ScrollView>
        <EventListCard onRowPress={onRowPress} rows={rows} testID={`${testID}-rows`} />
      </ScrollView>
    </View>
  );
}
