import { StatusBar } from 'expo-status-bar';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { IconButton, TOOLBAR_PILL_INSET } from '@/shared/ui';

// Full screen hides the status bar; this one frosted glass button is the way out, in the exact place of the full screen
// button (ADR 0071). Frosted (glassFill) so the disc over the page is never mistaken for an ayah wash. The enter button
// is the last item in the toolbar pill, so the row is right-aligned and its end padding matches the pill's: on an
// expanded window the panel toggle sits after the enter button and takes that space.
const EXIT_FULLSCREEN = { ios: 'arrow.down.right.and.arrow.up.left', android: 'fullscreen_exit' } as const;

export function MushafFullscreenExit({
  onExit,
  testID = 'mushaf-fullscreen-exit',
}: {
  onExit: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const windowClass = useWindowClass();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };
  const panelToggleWidth = windowClass === 'expanded' ? theme.size.touchTarget + TOOLBAR_PILL_INSET : 0;

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingEnd: theme.space[4] + TOOLBAR_PILL_INSET + panelToggleWidth,
        paddingTop: insets.top + theme.space[2] + TOOLBAR_PILL_INSET,
      }}
      testID={testID}
    >
      <StatusBar hidden />
      <IconButton
        frosted
        icon={EXIT_FULLSCREEN}
        label={t('reader.toolbar.exitFullscreen')}
        onPress={onExit}
        testID="mushaf-fullscreen-exit-button"
        variant="glass"
      />
    </View>
  );
}
