import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetHeader } from '@/shared/ui';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';

import { AzkarDetailsContent } from '../components/AzkarDetailsContent';
import { useEntry } from '../data/hooks';

/** The source and details sheet on compact and medium windows (the `/azkar/details/[entryKey]` route). */
export function AzkarDetailsScreen({ entryKey }: { entryKey: string }) {
  return (
    <SheetHost testID="azkar-details-sheet">
      <DetailsCard entryKey={entryKey} />
    </SheetHost>
  );
}

function DetailsCard({ entryKey }: { entryKey: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSheet();
  const detail = useEntry(entryKey);

  return (
    <SheetFrame testID="azkar-details-frame">
      <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
        <SheetHeader
          closeLabel={t('azkar.reader.close')}
          onClose={() => sheet?.close()}
          size="large"
          testID="azkar-details-header"
          title={t('azkar.details.title')}
        />
        <SheetScrollView>{detail === undefined ? null : <AzkarDetailsContent detail={detail} />}</SheetScrollView>
      </View>
    </SheetFrame>
  );
}
