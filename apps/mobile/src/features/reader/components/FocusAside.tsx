import { formatNumber } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui';

/** Focus frame: the ayah before and the ayah after, dimmed. */
export function FocusAside({
  textUthmani,
  verseNumber,
  fontScale = 1,
  testID,
}: {
  textUthmani: string;
  verseNumber: number;
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const line = `${textUthmani} ﴿${formatNumber(verseNumber, 'ar')}﴾`;

  return (
    <QuranText
      accessibilityElementsHidden
      align="center"
      fontScale={fontScale}
      importantForAccessibility="no-hide-descendants"
      style={{ opacity: theme.opacity.focusAside }}
      testID={testID}
      variant="quranFocusAside"
    >
      {line}
    </QuranText>
  );
}
