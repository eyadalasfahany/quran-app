import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

/** Prophetic dua text and attribution (quran-app-screens.html, #DuaHadithDetail). No audio (ADR 0055 §3). */
export function DuaHadithBody({
  text,
  attribution,
  testID = 'dua-hadith-body',
}: {
  text: string;
  attribution: string;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4], paddingHorizontal: theme.space[2] }} testID={testID}>
      <UiText align="center" style={arabicTextDirection} variant="dhikr">
        {text}
      </UiText>
      {attribution.trim().length > 0 ? (
        <UiText align="center" tone="muted" variant="caption">
          {attribution}
        </UiText>
      ) : null}
    </View>
  );
}
