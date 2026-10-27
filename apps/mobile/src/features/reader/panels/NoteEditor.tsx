import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, TextInput, View } from 'react-native';

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
import { Button, Card, uiTextProps, UiText, useContrastColors } from '@/shared/ui';

import { textDirection } from './panel-text';

const NOTE_FIELD_MIN_HEIGHT = 120;

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
      {/* The input carries the padding, so a tap anywhere in the box focuses it. */}
      <Card
        radius="md"
        style={[{ padding: 0 }, tooLong ? { borderColor: theme.colors.danger } : null]}
        testID={`${testID}-box`}
      >
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
              color: theme.colors.ink,
              minHeight: NOTE_FIELD_MIN_HEIGHT,
              padding: theme.space[3],
              textAlign: direction === 'rtl' ? 'right' : 'left',
              textAlignVertical: 'top',
              writingDirection: direction,
            },
          ]}
          testID={`${testID}-input`}
          value={body}
        />
      </Card>
      <UiText
        accessibilityLiveRegion="polite"
        testID={`${testID}-counter`}
        tone={tooLong ? 'danger' : 'muted'}
        variant="caption"
      >
        {tooLong ? t('reader.note.tooLong', { max }) : counter}
      </UiText>
      {failed ? (
        <UiText accessibilityLiveRegion="assertive" testID={`${testID}-error`} tone="danger" variant="caption">
          {t('reader.note.saveFailed')}
        </UiText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <Button disabled={!canSave} label={t('reader.note.save')} onPress={save} testID={`${testID}-save`} variant="primary" />
        {note === null ? null : (
          <Button label={t('reader.note.delete')} onPress={remove} testID={`${testID}-delete`} variant="danger" />
        )}
        {onDone ? <Button label={t('reader.note.cancel')} onPress={onDone} testID={`${testID}-cancel`} /> : null}
      </View>
    </View>
  );
}
