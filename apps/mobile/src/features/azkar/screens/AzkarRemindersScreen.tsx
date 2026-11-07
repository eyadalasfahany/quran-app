import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SheetHeader } from '@/shared/ui';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';

import { AzkarReminderRow } from '../components/AzkarReminderRow';
import { AzkarRemindersDeniedNotice } from '../components/AzkarRemindersDeniedNotice';
import { AzkarListCard } from '../components/AzkarListCard';
import { AzkarSectionTitle } from '../components/AzkarSectionTitle';
import { ReminderDisclaimer } from '../components/ReminderDisclaimer';
import { useAzkarCategories } from '../data';
import { useNotificationsGranted } from '../reminders/hooks';

/**
 * The reminder sheet (screens/, #AzkarReminders; the `/azkar/reminders` route). With a `categoryId` it
 * shows that category's reminder (the category screen's bell); with an `entryKey` it shows the single entry's reminder
 * (the details sheet). Otherwise it lists the session categories. The disclaimer always shows.
 */
export function AzkarRemindersScreen({
  categoryId,
  entryKey,
  testID = 'azkar-reminders-sheet',
}: {
  categoryId?: string;
  entryKey?: string;
  testID?: string;
}) {
  return (
    <SheetHost testID={testID}>
      <AzkarRemindersCard categoryId={categoryId} entryKey={entryKey} />
    </SheetHost>
  );
}

/**
 * The sheet's content. It reads the sheet context, so it must sit inside SheetHost; the screen above only hosts it.
 * (Read in the screen itself, the context is null and close does nothing.)
 */
function AzkarRemindersCard({ categoryId, entryKey }: { categoryId?: string; entryKey?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const sheet = useSheet();
  const categories = useAzkarCategories(locale);
  const { granted, refresh } = useNotificationsGranted();

  const sessions = categories.filter((category) => category.kind === 'session');
  const targets = categoryId === undefined ? sessions : categories.filter((category) => category.id === categoryId);

  const categoryName = (id: string) => t(`azkar.categories.${id}` as never);

  return (
    <SheetFrame testID="azkar-reminders-frame">
      <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
        <SheetHeader
          closeLabel={t('azkar.reader.close')}
          onClose={() => sheet?.close()}
          size="large"
          testID="azkar-reminders-header"
          title={t('azkar.reminders.title')}
        />
        <SheetScrollView>
          <View style={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
            <ReminderDisclaimer />
            {granted === false ? (
              <AzkarRemindersDeniedNotice onOpenSettings={() => void Linking.openSettings()} />
            ) : null}

            {entryKey !== undefined ? (
              <View style={{ gap: theme.space[2] }}>
                <AzkarSectionTitle title={t('azkar.reminders.entryAction')} />
                <AzkarListCard>
                  <AzkarReminderRow
                    onPermissionDenied={refresh}
                    targetKey={entryKey}
                    targetType="entry"
                    testID="azkar-reminder-entry"
                  />
                </AzkarListCard>
              </View>
            ) : (
              targets.map((category) => (
                <View key={category.id} style={{ gap: theme.space[2] }}>
                  <AzkarSectionTitle title={categoryName(category.id)} testID={`azkar-reminders-section-${category.id}`} />
                  <AzkarListCard>
                    <AzkarReminderRow
                      onPermissionDenied={refresh}
                      targetKey={category.id}
                      targetType="category"
                      testID={`azkar-reminder-${category.id}`}
                    />
                  </AzkarListCard>
                </View>
              ))
            )}
          </View>
        </SheetScrollView>
      </View>
    </SheetFrame>
  );
}
