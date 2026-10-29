import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { MINIMIZE_ICON, MORE_ICON } from './player-icons';
import { PlayerIconButton } from './PlayerIconButton';

// Minimize closes the full player. «المزيد» is disabled until a later step.
export function PlayerHeader({ onMinimize }: { onMinimize: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
      <PlayerIconButton glyphSize={24} icon={MINIMIZE_ICON} label={t('player.minimize')} onPress={onMinimize} testID="player-minimize" />
      <UiText style={{ color: theme.colors.playerMuted }} variant="caption" weight={500}>
        {t('player.nowPlaying')}
      </UiText>
      <PlayerIconButton disabled icon={MORE_ICON} label={t('player.more')} onPress={() => undefined} testID="player-more" />
    </View>
  );
}
