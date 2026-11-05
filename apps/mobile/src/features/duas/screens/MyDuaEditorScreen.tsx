import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetHeader } from '@/shared/ui';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';

import { MyDuaForm } from '../components/MyDuaForm';
import { MyDuaFormActions } from '../components/MyDuaFormActions';
import { editMyDua, removeMyDua } from '../data/my-dua-actions';
import { createMyDua, getMyDua } from '../data/my-duas-repository';
import { duasHref } from '../routes';

/** «أدعيتي» editor sheet (`/duas/mine/edit?id=`). `reminderOpen` opens the reminder row expanded (the list's bell). */
export function MyDuaEditorScreen({ duaId, reminderOpen = false }: { duaId: string | null; reminderOpen?: boolean }) {
  return (
    // A long dua needs the room the full detent offers, so the sheet opens there.
    <SheetHost initialDetent="full" testID="my-dua-editor-sheet">
      <EditorCard duaId={duaId} reminderOpen={reminderOpen} />
    </SheetHost>
  );
}

function EditorCard({ duaId, reminderOpen }: { duaId: string | null; reminderOpen: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSheet();
  const existing = duaId === null ? null : getMyDua(duaId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  // The id is set once the dua exists: a new dua closes on save like an edit, so no id is kept for it here.
  const savedId = existing?.id ?? null;

  useEffect(() => {
    if (existing === null && duaId !== null) {
      sheet?.close();
    }
  }, [duaId, existing, sheet]);

  const closeToMine = () => {
    sheet?.close();
    if (!router.canGoBack()) {
      router.replace(duasHref.mine);
    }
  };

  const onSave = () => {
    const input = { title: title.trim().length === 0 ? null : title, body };
    if (savedId === null) {
      createMyDua(input);
    } else {
      editMyDua(savedId, input);
    }
    closeToMine();
  };

  const onDelete = () => {
    if (savedId === null) {
      return;
    }
    removeMyDua(savedId);
    closeToMine();
  };

  return (
    <SheetFrame testID="my-dua-editor-frame">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
          <SheetHeader
            closeLabel={t('duas.editor.close')}
            onClose={() => sheet?.close()}
            size="compact"
            testID="my-dua-editor-header"
            title={savedId === null ? t('duas.editor.newTitle') : t('duas.editor.editTitle')}
          />
          <SheetScrollView keyboardShouldPersistTaps="handled">
            <MyDuaForm
              body={body}
              duaId={savedId}
              onBodyChange={setBody}
              onTitleChange={setTitle}
              reminderOpen={reminderOpen}
              testID="my-dua-form"
              title={title}
            />
          </SheetScrollView>
          <MyDuaFormActions
            canDelete={savedId !== null}
            onDelete={onDelete}
            onSave={onSave}
            saveDisabled={body.trim().length === 0}
            testID="my-dua-form"
          />
        </View>
      </KeyboardAvoidingView>
    </SheetFrame>
  );
}
