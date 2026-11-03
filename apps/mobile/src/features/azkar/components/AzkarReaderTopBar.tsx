import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { AzkarProgressBar } from './AzkarProgressBar';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

/** The reader's header: close at inline-start (visual right in RTL), centred title, «٥ من ٢٤», and the progress bar. */
export function AzkarReaderTopBar({
  title,
  progressText,
  fraction,
  onClose,
  testID = 'azkar-reader-top-bar',
}: {
  title: string;
  progressText: string;
  fraction: number;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3], paddingHorizontal: theme.space[4], paddingTop: theme.space[2] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
        <View style={{ alignItems: 'flex-start', flex: 1 }}>
          <IconButton icon={CLOSE} label={t('azkar.reader.close')} onPress={onClose} testID="azkar-reader-close" variant="surface" />
        </View>
        <View style={{ alignItems: 'center', flex: 3 }}>
          <UiText accessibilityRole="header" align="center" variant="headline">
            {title}
          </UiText>
          <UiText align="center" tone="muted" variant="caption">
            {progressText}
          </UiText>
        </View>
        <View style={{ flex: 1, minWidth: theme.size.touchTarget }} />
      </View>
      <AzkarProgressBar fraction={fraction} />
    </View>
  );
}
