import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton } from '@/shared/ui';

import { HadithBreadcrumb } from './HadithBreadcrumb';
import { HadithToolbar } from './HadithToolbar';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

/** The reader's top row: back, the breadcrumb (collection and book) and the toolbar. */
export function HadithReaderHeader({
  collectionTitle,
  bookTitle,
  saved,
  onBack,
  onToggleSave,
  onCopy,
  onShare,
  testID = 'hadith-reader-header',
}: {
  collectionTitle: string;
  bookTitle: string;
  saved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onCopy: () => void;
  onShare: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <IconButton icon={BACK} label={t('hadith.back')} mirrorInRtl onPress={onBack} testID={`${testID}-back`} variant="raised" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <HadithBreadcrumb bookTitle={bookTitle} collectionTitle={collectionTitle} testID={`${testID}-breadcrumb`} />
      </View>
      <HadithToolbar onCopy={onCopy} onShare={onShare} onToggleSave={onToggleSave} saved={saved} testID={`${testID}-toolbar`} />
    </View>
  );
}
