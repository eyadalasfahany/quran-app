import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ReaderMode } from '@/features/reader/anchor/reading-anchor';
import { Card, QuranText, UiText } from '@/shared/ui';

const PREVIEW_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

function previewVariant(mode: ReaderMode): 'quranMushaf' | 'quranReading' {
  return mode === 'mushaf' ? 'quranMushaf' : 'quranReading';
}

export function ScriptPreviewCard({ mode, testID = 'onboarding-script-preview' }: { mode: ReaderMode; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Card padding={4} testID={testID} tone="page">
      <View style={{ alignItems: 'center', gap: theme.space[2] }}>
        <QuranText align="center" variant={previewVariant(mode)}>
          {PREVIEW_TEXT}
        </QuranText>
        <UiText tone="muted" variant="caption">
          {t('onboarding.script.previewCaption')}
        </UiText>
      </View>
    </Card>
  );
}
