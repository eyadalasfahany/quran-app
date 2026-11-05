import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { MyDuaField } from './MyDuaField';
import { MyDuaReminderRow } from './MyDuaReminderRow';

/** Editor fields for «أدعيتي» (quran-app-screens.html, #MyDuaEditor): title, text, the device-only note and the reminder.
 *  Save and delete are `MyDuaFormActions`, pinned below the scroll area. */
export function MyDuaForm({
  title,
  body,
  onTitleChange,
  onBodyChange,
  duaId,
  reminderOpen = false,
  testID = 'my-dua-form',
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** Set once the dua exists; the reminder row keys off it. */
  duaId: string | null;
  /** Opens the reminder row expanded (the bell on the list does this). */
  reminderOpen?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <MyDuaField
        label={t('duas.editor.titleLabel')}
        onChangeText={onTitleChange}
        placeholder={t('duas.editor.titlePlaceholder')}
        testID={`${testID}-title`}
        value={title}
      />
      <MyDuaField
        label={t('duas.editor.bodyLabel')}
        multiline
        onChangeText={onBodyChange}
        placeholder={t('duas.editor.bodyPlaceholder')}
        testID={`${testID}-body`}
        value={body}
      />
      <UiText tone="muted" variant="caption" testID={`${testID}-device-only`}>
        {t('duas.editor.deviceOnly')}
      </UiText>
      {duaId !== null ? (
        <MyDuaReminderRow duaId={duaId} initiallyExpanded={reminderOpen} testID={`${testID}-reminder`} />
      ) : null}
    </View>
  );
}
