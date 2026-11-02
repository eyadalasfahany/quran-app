import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetHeader } from '@/shared/ui';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';

import { MyDuaForm } from '../components/MyDuaForm';
import { createMyDua, deleteMyDua, getMyDua, updateMyDua } from '../data/my-duas-repository';
import { duasHref } from '../routes';

/** «أدعيتي» editor sheet (`/duas/mine/edit?id=`). */
export function MyDuaEditorScreen({ duaId }: { duaId: string | null }) {
  return (
    <SheetHost testID="my-dua-editor-sheet">
      <EditorCard duaId={duaId} />
    </SheetHost>
  );
}

function EditorCard({ duaId }: { duaId: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSheet();
  const existing = duaId === null ? null : getMyDua(duaId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);

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
    const trimmedTitle = title.trim().length === 0 ? null : title;
    const nextBody = body;
    if (savedId === null) {
      const created = createMyDua({ title: trimmedTitle, body: nextBody });
      setSavedId(created.id);
      router.setParams({ id: created.id });
      return;
    }
    updateMyDua(savedId, { title: trimmedTitle, body: nextBody });
    closeToMine();
  };

  const onDelete = () => {
    if (savedId === null) {
      return;
    }
    deleteMyDua(savedId);
    closeToMine();
  };

  return (
    <SheetFrame testID="my-dua-editor-frame">
      <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
        <SheetHeader
          closeLabel={t('duas.editor.close')}
          onClose={() => sheet?.close()}
          size="large"
          testID="my-dua-editor-header"
          title={savedId === null ? t('duas.editor.newTitle') : t('duas.editor.editTitle')}
        />
        <SheetScrollView>
          <MyDuaForm
            body={body}
            canDelete={savedId !== null}
            duaId={savedId}
            onBodyChange={setBody}
            onDelete={onDelete}
            onSave={onSave}
            onTitleChange={setTitle}
            testID="my-dua-form"
            title={title}
          />
        </SheetScrollView>
      </View>
    </SheetFrame>
  );
}
