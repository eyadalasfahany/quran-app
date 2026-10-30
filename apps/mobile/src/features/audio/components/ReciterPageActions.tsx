import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button } from '@/shared/ui';

// The reciter page's bulk actions (the Downloads frame's «تنزيل الكل»). «حذف التنزيلات» is drawn only when
// something is downloaded, and it asks for confirmation before it runs (the caller's alert).
export function ReciterPageActions({
  showDelete,
  onDownloadAll,
  onDeleteAll,
  testID = 'reciter-page-actions',
}: {
  showDelete: boolean;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }} testID={testID}>
      <Button label={t('listen.reciter.downloadAll')} onPress={onDownloadAll} size="small" testID="reciter-download-all" />
      {showDelete ? (
        <Button
          label={t('listen.reciter.deleteAll')}
          onPress={onDeleteAll}
          size="small"
          testID="reciter-delete-all"
          variant="danger"
        />
      ) : null}
    </View>
  );
}
