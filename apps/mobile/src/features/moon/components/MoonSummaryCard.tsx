import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { MoonPhaseDisc } from './MoonPhaseDisc';

export function MoonSummaryCard({
  illumination,
  waxing,
  ageLabel,
  illuminationLabel,
  testID = 'moon-summary-card',
}: {
  illumination: number;
  waxing: boolean;
  ageLabel: string;
  illuminationLabel: string;
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
        gap: theme.space[5],
        padding: theme.space[5],
      }}
      testID={testID}
    >
      <MoonPhaseDisc illumination={illumination} waxing={waxing} />
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
            {t('moon.summary.age')}
          </UiText>
          <UiText variant="body">{ageLabel}</UiText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
            {t('moon.summary.illumination')}
          </UiText>
          <UiText variant="body">{illuminationLabel}</UiText>
        </View>
      </View>
    </View>
  );
}
