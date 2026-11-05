import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { Button, ConfirmDialog } from '@/shared/ui';

/**
 * Save and delete for «أدعيتي», pinned under the editor's scroll area so they stay on screen while a long dua scrolls. It
 * keeps clear of the home indicator. Delete asks first, in the shared ConfirmDialog.
 */
export function MyDuaFormActions({
  saveDisabled,
  canDelete,
  onSave,
  onDelete,
  testID = 'my-dua-form',
}: {
  saveDisabled: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <View style={{ gap: theme.space[3], paddingBottom: insets.bottom + theme.space[4] }} testID={`${testID}-actions`}>
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
            style={{ borderColor: 'transparent' }}
            testID={`${testID}-delete`}
            variant="danger"
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
