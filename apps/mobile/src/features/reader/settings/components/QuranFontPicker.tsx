import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { QURAN_FONTS, useTheme, type QuranFont } from '@/core/theme';
import { OnboardingRadioCard } from '@/shared/ui';

/** The Quran font choice in reader settings (ADR 0048): one radio card per font, applied in every mode. */
export function QuranFontPicker({
  value,
  onChange,
  testID = 'reader-font-picker',
}: {
  value: QuranFont;
  onChange: (font: QuranFont) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const select = (font: QuranFont) => {
    if (font === value) {
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(font);
  };

  return (
    <View
      accessibilityLabel={t('reader.settings.fontLabel')}
      accessibilityRole="radiogroup"
      style={{ gap: theme.space[2] }}
      testID={testID}
    >
      {QURAN_FONTS.map((font) => (
        <OnboardingRadioCard
          density="compact"
          key={font}
          onPress={() => select(font)}
          selected={font === value}
          subtitle={t(`reader.settings.fonts.${font}.subtitle`)}
          testID={`${testID}-${font}`}
          title={t(`reader.settings.fonts.${font}.name`)}
        />
      ))}
    </View>
  );
}
