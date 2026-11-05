import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/shared/ui';
import { ReaderActionButtons } from '@/features/azkar/components/ReaderActionButtons';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';

import { duasHref } from '../routes';

const BELL = { ios: 'bell', android: 'notifications' } as const;

/**
 * The reading view's action row for one «أدعيتي» entry: the reminder bell (in the first slot, where the favourite bookmark
 * sits for other readers), share, and text size. The bell is brand-toned while the reminder is on and muted when it is off.
 * It opens the editor with the reminder row expanded.
 */
export function MyDuaReaderActions({
  duaId,
  onShare,
  onTextSize,
  textSizeOpen,
  testID = 'my-dua-reader-actions',
}: {
  duaId: string;
  onShare: () => void;
  onTextSize: () => void;
  textSizeOpen: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const reminder = useAzkarReminder('my_dua', duaId);
  const reminderOn = reminder?.enabled === true;

  return (
    <ReaderActionButtons
      leadingAction={
        <IconButton
          hint={reminderOn ? t('duas.mine.reminderOnHint') : undefined}
          icon={BELL}
          label={t('duas.mine.reminder')}
          onPress={() => router.push(duasHref.mineEdit(duaId, { reminder: true }))}
          testID="my-dua-reader-bell"
          tone={reminderOn ? 'brand' : 'muted'}
          variant="plain"
        />
      }
      onShare={onShare}
      onTextSize={onTextSize}
      testID={testID}
      textSizeOpen={textSizeOpen}
    />
  );
}
