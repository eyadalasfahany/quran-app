import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, ConfirmDialog, uiTextProps, UiText, useContrastColors } from '@/shared/ui';

import { MyDuaReminderRow } from './MyDuaReminderRow';

function DuaField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText tone="muted" variant="caption" weight={600}>
        {label}
      </UiText>
      <TextInput
        {...uiTextProps('body')}
        accessibilityLabel={label}
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={[
          theme.text.body,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: focused ? theme.colors.brand : colors.line,
            borderRadius: theme.radius.lg,
            borderWidth: theme.stroke.focus,
            color: colors.ink,
            minHeight: multiline ? 120 : theme.size.touchTarget,
            paddingHorizontal: theme.space[4],
            paddingVertical: theme.space[3],
            textAlign: I18nManager.isRTL ? undefined : 'left',
          },
        ]}
        testID={`${testID}-input`}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

/** Editor fields for «أدعيتي» (quran-app-screens.html, #MyDuaEditor). */
export function MyDuaForm({
  title,
  body,
  onTitleChange,
  onBodyChange,
  duaId,
  onSave,
  onDelete,
  canDelete,
  testID = 'my-dua-form',
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** Set after the first save; the reminder row keys off it. */
  duaId: string | null;
  onSave: () => void;
  onDelete: () => void;
  canDelete: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const saveDisabled = body.trim().length === 0;

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <DuaField
        label={t('duas.editor.titleLabel')}
        onChangeText={onTitleChange}
        placeholder={t('duas.editor.titlePlaceholder')}
        testID={`${testID}-title`}
        value={title}
      />
      <DuaField
        label={t('duas.editor.bodyLabel')}
        multiline
        onChangeText={onBodyChange}
        placeholder={t('duas.editor.bodyPlaceholder')}
        testID={`${testID}-body`}
        value={body}
      />
      {duaId !== null ? <MyDuaReminderRow duaId={duaId} testID={`${testID}-reminder`} /> : null}
      <Button
        disabled={saveDisabled}
        label={t('duas.editor.save')}
        onPress={onSave}
        stretch
        testID={`${testID}-save`}
        variant="primary"
      />
      {canDelete ? (
        <>
          <Button
            label={t('duas.editor.delete')}
            onPress={() => setConfirmOpen(true)}
            stretch
            testID={`${testID}-delete`}
            variant="ghost"
          />
          <ConfirmDialog
            cancelLabel={t('duas.editor.deleteCancel')}
            confirmLabel={t('duas.editor.deleteConfirm')}
            destructive
            message={t('duas.editor.deleteBody')}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              onDelete();
            }}
            testID={`${testID}-delete-dialog`}
            title={t('duas.editor.deleteTitle')}
            visible={confirmOpen}
          />
        </>
      ) : null}
    </View>
  );
}
