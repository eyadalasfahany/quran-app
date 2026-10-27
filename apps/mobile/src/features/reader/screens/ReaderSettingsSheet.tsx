import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { listInstalledTranslations } from '@/features/reader/data/translations';
import { getVerseByKey } from '@/features/reader/data/verses';
import { IconButton, uiTextProps } from '@/shared/ui';

import { useReaderSettings } from '../settings';
import { FontScaleStepper } from '../settings/components/FontScaleStepper';
import { ModePicker } from '../settings/components/ModePicker';
import { ThemePicker } from '../settings/components/ThemePicker';
import { TranslationToggleList, type TranslationChoice } from '../settings/components/TranslationToggleList';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

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
    <View style={{ backgroundColor: theme.colors.surface, flex: 1 }} testID="reader-settings-sheet">
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: theme.space[4],
          paddingTop: theme.space[2],
        }}
      >
        <Text {...uiTextProps('title')} accessibilityRole="header" style={[theme.text.title, { color: theme.colors.ink }]}>
          {t('reader.settings.title')}
        </Text>
        <IconButton icon={CLOSE} label={t('reader.settings.close')} onPress={() => router.back()} testID="reader-settings-close" />
      </View>
      <ScrollView contentContainerStyle={{ gap: theme.space[6], padding: theme.space[4], paddingBottom: theme.space[8] }}>
        <ModePicker onChange={setMode} value={mode} />
        <ThemePicker />
        <FontScaleStepper onChange={setFontScale} previewText={preview} value={fontScale} />
        <TranslationToggleList onChange={setTranslationIds} selectedIds={translationIds} translations={installed} />
      </ScrollView>
    </View>
  );
}
