import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

const CALIBRATE_ICON: IconName = { ios: 'arrow.triangle.2.circlepath', android: 'rotate_right' };

/**
 * «حرّك جهازك على شكل ٨» — the gold notice pill shown while the compass reports poor
 * accuracy; it disappears on recovery. Drawn like the aligned pill (#Qibla frame).
 */
export function CompassCalibrationNotice({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.qiblaGoldSoft,
        borderColor: theme.colors.qiblaGoldStroke,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.space[2],
        paddingHorizontal: 14,
        paddingVertical: theme.space[2],
      }}
      testID={testID}
    >
      <Icon color={theme.colors.playerAccent} name={CALIBRATE_ICON} size={14} />
      <UiText style={{ color: theme.colors.playerAccent }} variant="caption" weight={600}>
        {t('home.salah.qiblaScreen.calibrate')}
      </UiText>
    </View>
  );
}
