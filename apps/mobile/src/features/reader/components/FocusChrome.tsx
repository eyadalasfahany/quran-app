import { I18nManager, View } from 'react-native';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { screenInsetsFor } from '@/core/layout/useScreenInsets';
import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

// Focus draws no reader toolbar: only the exit and the position (its frame in screens/, #Focus).
const CLOSE = { ios: 'xmark', android: 'close' } as const;
const NO_INSETS = { bottom: 0, left: 0, right: 0, top: 0 };

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
  // The side insets follow the reading direction: the exit sits at the start edge, clear of a landscape cutout.
  const insets = screenInsetsFor(useContext(SafeAreaInsetsContext) ?? NO_INSETS, I18nManager.isRTL);

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingEnd: theme.space[4] + insets.end,
        paddingStart: theme.space[4] + insets.start,
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
