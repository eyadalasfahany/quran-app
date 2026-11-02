import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ReaderMode } from '@/features/reader/anchor/reading-anchor';
import { Card, QuranText, UiText } from '@/shared/ui';

import { usePreviewVerseText } from '../hooks/usePreviewVerseText';

function previewVariant(mode: ReaderMode): 'quranMushaf' | 'quranReading' {
  return mode === 'mushaf' ? 'quranMushaf' : 'quranReading';
}

export function ScriptPreviewCard({ mode, testID = 'onboarding-script-preview' }: { mode: ReaderMode; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  // Null while the content database loads: no Quran text is drawn, not even a placeholder literal.
  const verseText = usePreviewVerseText();

  return (
    <Card padding={4} testID={testID} tone="page">
      <View style={{ alignItems: 'center', gap: theme.space[2] }}>
        {verseText === null ? null : (
          <QuranText align="center" variant={previewVariant(mode)}>
            {verseText}
          </QuranText>
        )}
        <UiText tone="muted" variant="caption">
          {t('onboarding.script.previewCaption')}
        </UiText>
      </View>
    </Card>
  );
}
