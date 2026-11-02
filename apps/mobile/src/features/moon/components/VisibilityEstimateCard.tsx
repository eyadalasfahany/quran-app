import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { VisibilityZone } from '../data/crescent';
import { VisibilityZonePill } from './VisibilityZonePill';
import { VisibilityZoneScale } from './VisibilityZoneScale';

const ZONE_KEY = { A: 'a', B: 'b', C: 'c', D: 'd' } as const;

/**
 * The Odeh (2004) estimate card (#MoonSighting): title and zone pill, criterion, the zone scale, the zone's result and
 * V. The disclaimer is a separate box below the card (MoonDisclaimer), as the frame draws it.
 */
export function VisibilityEstimateCard({
  zone,
  odehVLabel,
  testID = 'moon-estimate-card',
}: {
  zone: VisibilityZone;
  odehVLabel: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: 1,
        gap: theme.space[3],
        padding: theme.space[4],
      }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
        <UiText accessibilityRole="header" style={{ flex: 1 }} variant="headline">
          {t('moon.estimate.title')}
        </UiText>
        <VisibilityZonePill testID={`${testID}-zone`} zone={zone} />
      </View>
      <UiText style={{ color: theme.colors.inkMuted }} variant="caption">
        {t('moon.estimate.criterion')}
      </UiText>
      <VisibilityZoneScale active={zone} />
      <UiText variant="headline">{t(`moon.zoneResults.${ZONE_KEY[zone]}`)}</UiText>
      <UiText style={{ color: theme.colors.inkMuted, writingDirection: 'ltr' }} variant="caption">
        {t('moon.estimate.odehV', { value: odehVLabel })}
      </UiText>
    </View>
  );
}
