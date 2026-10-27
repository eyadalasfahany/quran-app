import type { QuranTypeToken } from '@quran/design-tokens';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui';

export function BismillahLine({
  text,
  fontScale = 1,
  typeToken = 'quranReading',
  testID,
}: {
  text: string;
  fontScale?: number;
  typeToken?: Extract<QuranTypeToken, 'quranReading' | 'quranMushaf'>;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        paddingBottom: theme.space[3],
        paddingTop: theme.space[2],
      }}
      testID={testID}
    >
      <QuranText align="center" fontScale={fontScale} variant={typeToken}>
        {text}
      </QuranText>
    </View>
  );
}
