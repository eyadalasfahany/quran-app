import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// A surah the reciter has no audio for (ADR 0062). It keeps the download row's metrics and dims, shows «غير متوفرة»
// where the play or download control would be, and is not pressable: it is a plain view, not a button.
export function UnavailableSurahRow({
  title,
  showDivider = false,
  testID,
}: {
  title: string;
  showDivider?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      accessible
      accessibilityLabel={t('listen.reciter.surahUnavailableLabel', { surah: title })}
      accessibilityState={{ disabled: true }}
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: theme.size.downloadRowMinHeight,
          paddingHorizontal: theme.size.downloadRowInset,
        },
        showDivider ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline } : null,
      ]}
      testID={testID}
    >
      <View style={{ flex: 1 }}>
        <UiText tone="muted" variant="headline">
          {title}
        </UiText>
      </View>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: theme.size.touchTarget,
        }}
      >
        <UiText tone="muted" variant="caption">
          {t('listen.reciter.surahUnavailable')}
        </UiText>
      </View>
    </View>
  );
}
