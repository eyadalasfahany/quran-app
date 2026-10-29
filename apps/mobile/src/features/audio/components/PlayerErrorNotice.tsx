import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { ERROR_KEYS } from '../player-view';
import type { PlayerErrorCode } from '../playerStore';

// Takes the ayah card's place when playback fails. The message comes from the error code, never the raw error.
export function PlayerErrorNotice({ code }: { code: PlayerErrorCode }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        borderColor: theme.colors.playerLine,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        paddingHorizontal: theme.space[4],
        paddingVertical: 14,
      }}
      testID="player-error"
    >
      <UiText style={{ color: theme.colors.playerInk }} variant="subhead" align="center">
        {t(ERROR_KEYS[code])}
      </UiText>
    </View>
  );
}
