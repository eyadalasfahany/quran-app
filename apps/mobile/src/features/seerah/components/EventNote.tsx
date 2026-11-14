import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

export type EventNoteKind = 'place' | 'year' | 'uncertain';

const NOTES = {
  place: { body: 'seerah.event.notes.placeNotStatedBody', icon: { ios: 'mappin.and.ellipse', android: 'location_on' }, title: 'seerah.event.notes.placeNotStatedTitle' },
  year: { body: 'seerah.event.notes.yearNotStatedBody', icon: { ios: 'clock', android: 'schedule' }, title: 'seerah.event.notes.yearNotStatedTitle' },
  uncertain: { body: 'seerah.event.notes.uncertainBody', icon: { ios: 'info.circle', android: 'info' }, title: 'seerah.event.notes.uncertainTitle' },
} as const satisfies Record<EventNoteKind, { body: string; icon: IconName; title: string }>;

/**
 * A quiet card on the event page that says what the book does not state: the place (the event sits under «أخرى»), the year
 * (it sits under «غير محدد»), or that the place or time is approximate. A dashed edge, as everywhere «not stated» is drawn.
 */
export function EventNote({ kind, testID }: { kind: EventNoteKind; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const note = NOTES[kind];

  return (
    <View
      accessibilityRole="summary"
      style={{
        alignItems: 'flex-start',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderStyle: 'dashed',
        borderWidth: theme.stroke.focus,
        flexDirection: 'row',
        gap: theme.space[3],
        padding: theme.space[4],
      }}
      testID={testID ?? `seerah-event-note-${kind}`}
    >
      <Icon color={colors.inkMuted} name={note.icon} size={theme.size.icon} />
      <View style={{ flex: 1, gap: 2 }}>
        <UiText variant="subhead" weight={600}>
          {t(note.title)}
        </UiText>
        <UiText tone="muted" variant="caption">
          {t(note.body)}
        </UiText>
      </View>
    </View>
  );
}
