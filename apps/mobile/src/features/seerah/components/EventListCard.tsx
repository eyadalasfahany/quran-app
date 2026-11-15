import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { EventListRow } from './EventListRow';

export type EventListItem = { id: string; title: string; subtitle: string };

/**
 * A rounded card holding event rows with hairlines between them (frame SeerahList). `dashed` is the «غير محدد» group: the
 * same card on a dashed edge, the mark of «not stated».
 */
export function EventListCard({
  rows,
  onRowPress,
  dashed = false,
  testID,
}: {
  rows: readonly EventListItem[];
  onRowPress: (id: string) => void;
  dashed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderWidth: dashed ? theme.stroke.focus : theme.stroke.hairline,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      {rows.map((row, index) => (
        <EventListRow
          key={row.id}
          onPress={() => onRowPress(row.id)}
          separator={index < rows.length - 1}
          subtitle={row.subtitle}
          testID={testID ? `${testID}-${row.id}` : undefined}
          title={row.title}
        />
      ))}
    </View>
  );
}
