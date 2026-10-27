import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Text, TextInput, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import {
  deleteNote,
  NOTE_MAX_CHARACTERS,
  noteCharacterCount,
  saveNote,
  type Note,
  type UserStore,
} from '@/features/library/data';
import { uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

import { PanelButton } from './PanelButton';
import { textDirection } from './panel-text';

export function NoteEditor({
  verseId,
  note,
  store,
  onDone,
  testID = 'note-editor',
}: {
  verseId: number;
  // The ayah's latest note, edited in place: saving writes the new body, then removes the old row.
  note: Note | null;
  store?: UserStore;
  onDone?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const [body, setBody] = useState(note?.body ?? '');
  const [failed, setFailed] = useState(false);

  const count = noteCharacterCount(body);
  const tooLong = count > NOTE_MAX_CHARACTERS;
  const empty = body.trim().length === 0;
  const unchanged = note !== null && body === note.body;
  const canSave = !tooLong && !empty && !unchanged;
  // The field follows what the reader types, not the interface language.
  const direction = textDirection(body, I18nManager.isRTL ? 'rtl' : 'ltr');
  const max = formatNumber(NOTE_MAX_CHARACTERS, locale);
  const counter = t('reader.note.counter', { count: formatNumber(count, locale), max });

  const save = () => {
    if (!canSave) {
      return;
    }
    try {
      saveNote(verseId, body, store);
      if (note !== null) {
        deleteNote(note.id, store);
      }
      setFailed(false);
      onDone?.();
    } catch {
      setFailed(true);
    }
  };

  const remove = () => {
    if (note === null) {
      return;
    }
    try {
      deleteNote(note.id, store);
      setFailed(false);
      onDone?.();
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <TextInput
        {...uiTextProps('body')}
        accessibilityHint={counter}
        accessibilityLabel={t('reader.note.label')}
        multiline
        onChangeText={setBody}
        placeholder={t('reader.note.placeholder')}
        placeholderTextColor={colors.inkMuted}
        style={[
          theme.text.body,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: tooLong ? theme.colors.danger : colors.line,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            color: theme.colors.ink,
            minHeight: 120,
            padding: theme.space[3],
            textAlign: direction === 'rtl' ? 'right' : 'left',
            textAlignVertical: 'top',
            writingDirection: direction,
          },
        ]}
        testID={`${testID}-input`}
        value={body}
      />
      <Text
        {...uiTextProps('caption')}
        accessibilityLiveRegion="polite"
        style={[theme.text.caption, { color: tooLong ? theme.colors.danger : colors.inkMuted }]}
        testID={`${testID}-counter`}
      >
        {tooLong ? t('reader.note.tooLong', { max }) : counter}
      </Text>
      {failed ? (
        <Text
          {...uiTextProps('caption')}
          accessibilityLiveRegion="assertive"
          style={[theme.text.caption, { color: theme.colors.danger }]}
          testID={`${testID}-error`}
        >
          {t('reader.note.saveFailed')}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <PanelButton disabled={!canSave} label={t('reader.note.save')} onPress={save} testID={`${testID}-save`} variant="primary" />
        {note === null ? null : (
          <PanelButton label={t('reader.note.delete')} onPress={remove} testID={`${testID}-delete`} variant="danger" />
        )}
        {onDone ? <PanelButton label={t('reader.note.cancel')} onPress={onDone} testID={`${testID}-cancel`} /> : null}
      </View>
    </View>
  );
}
