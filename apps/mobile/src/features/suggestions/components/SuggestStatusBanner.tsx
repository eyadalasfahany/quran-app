import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

export type SuggestStatusKind = 'offline' | 'limited' | 'failed';

// Offline uses the same Wi-Fi glyph as the app-wide offline strip. The other two outcomes use a plain alert glyph.
const ICONS: Record<SuggestStatusKind, IconName> = {
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  limited: { ios: 'exclamationmark.circle', android: 'error' },
  failed: { ios: 'exclamationmark.circle', android: 'error' },
};

const ICON_SIZE = 20;

/**
 * The note above the submit button when a send did not go through (quran-app-screens.html, #SuggestSheetOffline). It is
 * a rounded card on the page colour, with a hairline, and it sits in the flow so it never covers a field.
 */
export function SuggestStatusBanner({ kind, testID = 'suggest-status' }: { kind: SuggestStatusKind; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const message = t(`suggest.${kind}`);

  return (
    <View
      accessibilityLabel={message}
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: colors.line,
        borderRadius: theme.radius.md,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: theme.space[4] - 2,
        paddingVertical: theme.space[3],
      }}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={ICONS[kind]} size={ICON_SIZE} testID={`${testID}-icon`} />
      <UiText style={{ flex: 1, lineHeight: 22 }} variant="subhead">
        {message}
      </UiText>
    </View>
  );
}
