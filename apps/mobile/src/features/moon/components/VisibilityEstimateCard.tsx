import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { VisibilityZone } from '../data/crescent';
import { MoonDisclaimer } from './MoonDisclaimer';
import { VisibilityZoneScale } from './VisibilityZoneScale';

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
  const zoneKey = zone.toLowerCase() as Lowercase<VisibilityZone>;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: 1,
        gap: theme.space[3],
        padding: theme.space[5],
      }}
      testID={testID}
    >
      <UiText accessibilityRole="header" variant="headline">
        {t('moon.estimate.title')}
      </UiText>
      <UiText style={{ color: theme.colors.inkMuted }} variant="caption">
        {t('moon.estimate.criterion')}
      </UiText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
          {t('moon.estimate.odehV')}
        </UiText>
        <UiText variant="body">{odehVLabel}</UiText>
      </View>
      <View style={{ gap: theme.space[2] }}>
        <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
          {t('moon.estimate.zone')}
        </UiText>
        <VisibilityZoneScale active={zone} />
        <UiText variant="body">{t(`moon.zones.${zoneKey}`)}</UiText>
        <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
          {t('moon.estimate.result')}
        </UiText>
        <UiText variant="body">{t(`moon.zoneResults.${zoneKey}`)}</UiText>
      </View>
      <MoonDisclaimer testID={`${testID}-disclaimer`} />
    </View>
  );
}
