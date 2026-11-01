import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, SheetHeader } from '@/shared/ui';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';

import { useEntry } from '../data';
import { AzkarDetailsContent } from './AzkarDetailsContent';

/**
 * The source and details beside the reader on expanded windows (the reader's side-panel approach). Outside a sheet,
 * `SheetScrollView` is a plain scroll view.
 */
export function AzkarDetailsPanel({
  entryKey,
  onClose,
  testID = 'azkar-details-panel',
}: {
  entryKey: string;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const detail = useEntry(entryKey);

  if (detail === undefined) {
    return null;
  }

  return (
    <GlassSurface
      accessibilityLabel={t('azkar.reader.details')}
      accessibilityRole="summary"
      radius="xl"
      style={{ height: '100%', padding: theme.space[4], width: '100%' }}
      testID={testID}
    >
      <SheetHeader closeLabel={t('azkar.reader.close')} onClose={onClose} size="compact" title={t('azkar.details.title')} />
      <View style={{ flex: 1, paddingTop: theme.space[4] }}>
        <SheetScrollView>
          <AzkarDetailsContent detail={detail} />
        </SheetScrollView>
      </View>
    </GlassSurface>
  );
}
