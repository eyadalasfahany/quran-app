import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

/** One Mushaf page that could not be read: its size, a line of text, and a retry (ADR 0090 D6). */
export function MushafPageError({
  width,
  height,
  onRetry,
  testID,
}: {
  width: number;
  height: number;
  onRetry: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', gap: theme.space[3], height, justifyContent: 'center', width }}
      testID={testID}
    >
      <UiText tone="muted" variant="body">
        {t('reader.mushafDownload.pageError')}
      </UiText>
      <Button label={t('reader.mushafDownload.pageRetry')} onPress={onRetry} testID={testID ? `${testID}-retry` : undefined} variant="secondary" />
    </View>
  );
}
