import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { MoonPhaseDisc } from './MoonPhaseDisc';

/** The hero card (#MoonSighting): the evening's date line, the age at sunset, and the illumination. */
export function MoonSummaryCard({
  eveningLabel,
  illumination,
  illuminationLabel,
  ageLabel,
  waxing,
  testID = 'moon-summary-card',
}: {
  eveningLabel: string;
  illumination: number;
  illuminationLabel: string;
  ageLabel: string;
  waxing: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.space[4],
        padding: theme.space[4],
      }}
      testID={testID}
    >
      <MoonPhaseDisc illumination={illumination} waxing={waxing} />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText style={{ color: theme.colors.inkMuted }} variant="caption">
          {eveningLabel}
        </UiText>
        <UiText style={{ color: theme.colors.inkMuted }} testID={`${testID}-age-label`} variant="caption">
          {t('moon.summary.age')}
        </UiText>
        <UiText testID={`${testID}-age`} variant="displaySm">
          {ageLabel}
        </UiText>
        <UiText variant="subhead">
          <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
            {t('moon.summary.illumination')}
          </UiText>
          {' · '}
          <UiText testID={`${testID}-illumination`} variant="subhead" weight={600}>
            {illuminationLabel}
          </UiText>
        </UiText>
      </View>
    </View>
  );
}
