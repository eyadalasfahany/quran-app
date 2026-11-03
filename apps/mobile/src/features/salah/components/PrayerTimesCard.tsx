import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * Raised card for today's six times, with a section label above the list
 * (ADR 0057 times-card redesign).
 */
export function PrayerTimesCard({ children, testID = 'salah-times' }: { children: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText style={{ marginHorizontal: theme.space[1] }} tone="muted" variant="caption" weight={600}>
        {t('salah.timesTitle')}
      </UiText>
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
        testID={`${testID}-card`}
      >
        {children}
      </View>
    </View>
  );
}
