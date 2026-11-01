import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, EmptyState } from '@/shared/ui';

// The offline or failed-font placeholder. «إعادة المحاولة» retries the font; the reading-mode action sits under it
// when both are offered.
export function MushafPagePlaceholder({
  variant = 'offline',
  onSwitchToReading,
  onRetry,
  testID,
}: {
  /** Offline or failed font download vs missing mushaf layout data. */
  variant?: 'offline' | 'missing-layout';
  onSwitchToReading?: () => void;
  onRetry?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const bodyKey =
    variant === 'missing-layout' ? 'reader.mushaf.missingLayoutBody' : 'reader.mushaf.placeholderBody';

  return (
    <View
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[6],
      }}
      testID={testID}
    >
      <EmptyState
        action={
          onRetry
            ? { label: t('reader.mushaf.retry'), onPress: onRetry }
            : onSwitchToReading
              ? { label: t('reader.mushaf.switchToReading'), onPress: onSwitchToReading }
              : undefined
        }
        body={t(bodyKey)}
        title={t('reader.mushaf.placeholderTitle')}
      />
      {onRetry && onSwitchToReading ? (
        <Button
          label={t('reader.mushaf.switchToReading')}
          onPress={onSwitchToReading}
          style={{ alignSelf: 'center' }}
          testID={testID ? `${testID}-reading` : undefined}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}
