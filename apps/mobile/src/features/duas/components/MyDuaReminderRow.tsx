import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';
import { AzkarReminderRow } from '@/features/azkar/components/AzkarReminderRow';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';

import { reminderClockLabel } from '../data/reminder-time';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * The reminder of one «أدعيتي» entry (`target_type` `my_dua`). Collapsed by default: a raised card with the title and the
 * current state (off, the clock time, or on). Pressing it expands the Azkar reminder settings underneath. `initiallyExpanded`
 * opens it at once, as the bell on the list does.
 */
export function MyDuaReminderRow({
  duaId,
  initiallyExpanded = false,
  testID = 'my-dua-reminder-row',
}: {
  duaId: string;
  initiallyExpanded?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const reminder = useAzkarReminder('my_dua', duaId);
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const title = t('duas.editor.reminderTitle');
  const detail = reminder?.enabled
    ? (reminderClockLabel(reminder, locale) ?? t('duas.editor.reminderOn'))
    : t('duas.editor.reminderOff');

  return (
    <View style={{ gap: theme.space[3] }}>
      <Pressable
        accessibilityHint={detail}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((open) => !open)}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: 52,
          opacity: pressed ? theme.opacity.pressed : 1,
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[3],
        })}
        testID={testID}
      >
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <UiText variant="body" weight={600}>
            {title}
          </UiText>
          <UiText tone="muted" variant="caption">
            {detail}
          </UiText>
        </View>
        <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
      </Pressable>
      {expanded ? <AzkarReminderRow targetKey={duaId} targetType="my_dua" testID={`${testID}-settings`} /> : null}
    </View>
  );
}
