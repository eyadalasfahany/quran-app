import { useTheme } from '@/core/theme';

import { Card } from './Card';
import { QuranText } from './QuranText';
import { UiText } from './UiText';

export function WordMeaningChip({
  word,
  meaning,
  meaningDirection = 'ltr',
  fontScale = 1,
  testID,
}: {
  word: string;
  meaning: string;
  meaningDirection?: 'ltr' | 'rtl';
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Card
      accessibilityLabel={`${word}, ${meaning}`}
      accessible
      padding={2}
      radius="md"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        gap: 2,
        paddingHorizontal: theme.space[3],
      }}
      testID={testID}
    >
      <QuranText
        accessible={false}
        fontScale={fontScale}
        importantForAccessibility="no"
        testID={testID ? `${testID}-word` : undefined}
        variant="quranWord"
      >
        {word}
      </QuranText>
      <UiText
        accessible={false}
        align="center"
        importantForAccessibility="no"
        style={{ writingDirection: meaningDirection }}
        testID={testID ? `${testID}-meaning` : undefined}
        tone="muted"
        variant="caption"
      >
        {meaning}
      </UiText>
    </Card>
  );
}
