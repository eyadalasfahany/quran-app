import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

const ALIGNED_ICON: IconName = { ios: 'checkmark', android: 'check' };

/**
 * «أنت باتجاه القبلة» — the gold status pill shown while the needle sits on the
 * Kaaba marker (quran-app-screens.html, #Qibla; role=status there).
 */
export function QiblaAlignedPill({ testID }: { testID?: string }) {
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
      <Icon color={theme.colors.playerAccent} name={ALIGNED_ICON} size={14} />
      <UiText style={{ color: theme.colors.playerAccent }} variant="caption" weight={600}>
        {t('home.salah.qiblaScreen.aligned')}
      </UiText>
    </View>
  );
}
