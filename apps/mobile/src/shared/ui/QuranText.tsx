import type { QuranTypeToken } from '@quran/design-tokens';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { quranText } from './textStyles';
import { textToneColor, type TextTone } from './UiText';
import { useContrastColors } from './useContrastColors';

// Every Quran string, rendered exactly as stored. It follows the reader's 80–160% setting, never the
// system text size, and is never truncated.
export function QuranText({
  variant,
  fontScale = 1,
  tone = 'ink',
  align = 'start',
  style,
  children,
  ...rest
}: {
  variant: QuranTypeToken;
  fontScale?: number;
  tone?: TextTone;
  // 'start' is the physical right: Quran text runs right to left in every locale. 'justify' runs each
  // full line from edge to edge; a paragraph's last line keeps to the start.
  align?: 'start' | 'center' | 'justify';
  style?: StyleProp<TextStyle>;
} & Omit<TextProps, 'style' | 'allowFontScaling' | 'numberOfLines' | 'ellipsizeMode'>) {
  const colors = useContrastColors();

  return (
    <Text
      {...rest}
      allowFontScaling={false}
      style={[
        quranText(variant, fontScale),
        { color: textToneColor(colors, tone) },
        align === 'start' ? null : { textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
