import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Button, Card, ConfirmDialog, EmptyState, Screen } from '@/shared/ui';

import { type AzkarDownloadPort } from '../audio/downloads';
import { azkarDownloadPort } from '../audio/port';
import { useAzkarDownloads } from '../audio/hooks';
import { AzkarDownloadRow } from '../components/AzkarDownloadRow';
import { AzkarScreenHeader } from '../components/AzkarScreenHeader';
import { AzkarStorageSummary } from '../components/AzkarStorageSummary';
import { azkarHref, goBackOr } from '../routes';

const EMPTY_ICON = { ios: 'speaker.wave.2', android: 'volume_up' } as const;
const REMOVE_ALL_ICON = { ios: 'trash', android: 'delete_sweep' } as const;

/**
 * Saved audio (screens/, #AzkarDownloads and #AzkarDownloadsEmpty). It lists the downloaded, downloading
 * and failed recordings of the port, with the storage they use. With nothing downloaded it shows the empty state and
 * no buttons.
 */
export function AzkarDownloadsScreen({
  port = azkarDownloadPort,
  testID = 'screen-azkar-downloads',
}: {
  port?: AzkarDownloadPort;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const downloads = useAzkarDownloads(port);
  const { entries } = downloads;

  const [removeOpen, setRemoveOpen] = useState(false);

  // «حذف الكل» asks first: the removal cannot be undone from this screen.
  const confirmRemoveAll = () => {
    setRemoveOpen(true);
  };

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader onBack={() => goBackOr(azkarHref.home)} title={t('azkar.downloads.title')} />
          {entries.length === 0 ? (
            <EmptyState
              body={t('azkar.downloads.emptyBody')}
              icon={EMPTY_ICON}
              testID="azkar-downloads-empty"
              title={t('azkar.downloads.emptyTitle')}
            />
          ) : (
            <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
              <AzkarStorageSummary bytes={downloads.storageBytes} />
              <Card padding={1} radius="lg" style={{ overflow: 'hidden', padding: 0 }}>
                {entries.map((entry, index) => (
                  <AzkarDownloadRow
                    entry={entry}
                    key={entry.recordingKey}
                    onCancel={downloads.cancel}
                    onRemove={downloads.remove}
                    onRetry={downloads.retry}
                    showDivider={index < entries.length - 1}
                    testID={`azkar-download-${index + 1}`}
                  />
                ))}
              </Card>
              <View style={{ alignItems: 'center' }}>
                <Button label={t('azkar.downloads.removeAll')} onPress={confirmRemoveAll} testID="azkar-downloads-remove-all" variant="danger" />
              </View>
            </ScrollView>
          )}
        </View>
      </ContentColumn>
      <ConfirmDialog
        cancelLabel={t('azkar.downloads.removeAllCancel')}
        confirmLabel={t('azkar.downloads.removeAllConfirm')}
        destructive
        icon={REMOVE_ALL_ICON}
        message={t('azkar.downloads.removeAllBody')}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => {
          setRemoveOpen(false);
          downloads.removeAll();
        }}
        testID="azkar-downloads-remove-dialog"
        title={t('azkar.downloads.removeAllTitle')}
        visible={removeOpen}
      />
    </Screen>
  );
}
