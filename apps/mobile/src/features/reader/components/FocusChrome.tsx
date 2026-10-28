import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

// Focus draws no reader toolbar: only the exit and the position (its frame in quran-app-screens.html, #Focus).
const CLOSE = { ios: 'xmark', android: 'close' } as const;

export function FocusChrome({
  position,
  onExit,
  testID = 'focus-chrome',
}: {
  /** «{surah} · الآية {current} من {total}», built by the screen from the Focus ayah. */
  position: string;
  onExit: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.space[4],
        paddingTop: insets.top + theme.space[2],
      }}
      testID={testID}
    >
      <IconButton
        icon={CLOSE}
        iconSize={theme.size.closeGlyph}
        label={t('reader.focus.exit')}
        onPress={onExit}
        testID="focus-exit"
        variant="glass"
      />
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: theme.space[2] }}>
        <UiText align="center" numberOfLines={1} scale="bar" testID="focus-position" tone="muted" variant="caption">
          {position}
        </UiText>
      </View>
      {/* Balances the exit button, so the position sits centred. */}
      <View style={{ width: theme.size.touchTarget }} />
    </View>
  );
}
