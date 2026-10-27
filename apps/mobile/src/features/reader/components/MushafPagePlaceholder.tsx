import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState } from '@/shared/ui';

export function MushafPagePlaceholder({
  variant = 'offline',
  onSwitchToReading,
  testID,
}: {
  /** Offline or failed font download vs missing mushaf layout data. */
  variant?: 'offline' | 'missing-layout';
  onSwitchToReading?: () => void;
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
          onSwitchToReading
            ? { label: t('reader.mushaf.switchToReading'), onPress: onSwitchToReading }
            : undefined
        }
        body={t(bodyKey)}
        title={t('reader.mushaf.placeholderTitle')}
      />
    </View>
  );
}
