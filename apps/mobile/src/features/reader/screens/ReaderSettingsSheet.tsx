import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { listInstalledTranslations } from '@/features/reader/data/translations';
import { getVerseByKey } from '@/features/reader/data/verses';
import { SheetHeader } from '@/shared/ui';

import { SheetFrame } from '../components/SheetFrame';
import { useReaderSettings } from '../settings';
import { FontScaleStepper } from '../settings/components/FontScaleStepper';
import { ModePicker } from '../settings/components/ModePicker';
import { ThemePicker } from '../settings/components/ThemePicker';
import { TranslationToggleList, type TranslationChoice } from '../settings/components/TranslationToggleList';

function loadInstalledTranslations(labelFor: (id: number) => string): TranslationChoice[] {
  try {
    return listInstalledTranslations(openContentDb().executor).map((row) => ({
      authorName: null,
      id: row.resourceId,
      name: labelFor(row.resourceId),
    }));
  } catch {
    return [];
  }
}

function loadPreviewText(): string | undefined {
  try {
    return getVerseByKey(openContentDb().executor, '1:1')?.textUthmani;
  } catch {
    return undefined;
  }
}

export function ReaderSettingsSheet({
  translations,
  previewText,
}: {
  translations?: readonly TranslationChoice[];
  previewText?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const translationIds = useReaderSettings((state) => state.translationIds);
  const setMode = useReaderSettings((state) => state.setMode);
  const setFontScale = useReaderSettings((state) => state.setFontScale);
  const setTranslationIds = useReaderSettings((state) => state.setTranslationIds);
  const installed = useMemo(
    () => translations ?? loadInstalledTranslations((id) => t('reader.settings.translationFallback', { id })),
    [t, translations],
  );
  const preview = previewText ?? loadPreviewText();

  return (
    <SheetFrame testID="reader-settings-sheet">
      <View style={{ paddingHorizontal: theme.space[4], paddingTop: theme.space[5] }}>
        <SheetHeader
          closeLabel={t('reader.settings.close')}
          onClose={() => router.back()}
          size="large"
          testID="reader-settings"
          title={t('reader.settings.title')}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ gap: theme.space[6], padding: theme.space[4], paddingBottom: theme.space[8] }}
        style={{ flex: 1 }}
      >
        <ModePicker onChange={setMode} value={mode} />
        <ThemePicker />
        <FontScaleStepper onChange={setFontScale} previewText={preview} value={fontScale} />
        <TranslationToggleList onChange={setTranslationIds} selectedIds={translationIds} translations={installed} />
      </ScrollView>
    </SheetFrame>
  );
}
