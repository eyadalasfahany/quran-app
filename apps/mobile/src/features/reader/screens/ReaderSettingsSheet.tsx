import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { discoverIdForMode } from '@/features/discover/reader-modes';
import { markDiscovered } from '@/features/discover/store';
import { SheetHeader } from '@/shared/ui';

import { SheetFrame } from '../components/SheetFrame';
import { SheetScrollView } from '../components/SheetScrollView';
import { useSheet } from '../components/sheet-context';
import { useReaderSettings } from '../settings';
import { FontScaleStepper } from '../settings/components/FontScaleStepper';
import { ModePicker } from '../settings/components/ModePicker';
import { QuranFontPicker } from '../settings/components/QuranFontPicker';
import { SettingsSection } from '../settings/components/SettingsSection';
import { ThemePicker } from '../settings/components/ThemePicker';

/** Sheet card padding and gaps on the settings frame (quran-app-screens.html: padding 10px 18px 20px; gap 14px). */
const SHEET_PADDING_H = 18;
const SHEET_PADDING_TOP = 14;
const SHEET_PADDING_BOTTOM = 20;
const SHEET_GAP = 14;

export function ReaderSettingsSheet() {
  const { t } = useTranslation();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const quranFont = useReaderSettings((state) => state.quranFont);
  const setMode = useReaderSettings((state) => state.setMode);
  const setFontScale = useReaderSettings((state) => state.setFontScale);
  const setQuranFont = useReaderSettings((state) => state.setQuranFont);
  const sheet = useSheet();

  return (
    <SheetFrame grabber="muted" testID="reader-settings-sheet">
      <View style={{ paddingHorizontal: SHEET_PADDING_H, paddingTop: SHEET_PADDING_TOP }}>
        <SheetHeader
          closeLabel={t('reader.settings.close')}
          closeTone="track"
          onClose={() => {
            if (sheet === null) {
              router.back();
            } else {
              sheet.close();
            }
          }}
          size="large"
          testID="reader-settings"
          title={t('reader.settings.title')}
        />
      </View>
      <SheetScrollView
        contentContainerStyle={{
          gap: SHEET_GAP,
          paddingBottom: SHEET_PADDING_BOTTOM,
          paddingHorizontal: SHEET_PADDING_H,
          paddingTop: SHEET_PADDING_TOP,
        }}
        style={{ flex: 1 }}
        testID="reader-settings-scroll"
      >
        <SettingsSection label={t('reader.settings.modeLabel')}>
          <ModePicker
            onChange={(next) => {
              // The Discover row ticks on the person's pick, not in the store (ADR 0053 §2).
              markDiscovered(discoverIdForMode(next));
              setMode(next);
            }}
            value={mode}
          />
        </SettingsSection>
        <SettingsSection label={t('reader.settings.themeLabel')}>
          <ThemePicker />
        </SettingsSection>
        <SettingsSection label={t('reader.settings.fontScale')} layout="inline">
          <FontScaleStepper onChange={setFontScale} value={fontScale} />
        </SettingsSection>
        <SettingsSection label={t('reader.settings.fontLabel')}>
          <QuranFontPicker onChange={setQuranFont} value={quranFont} />
        </SettingsSection>
      </SheetScrollView>
    </SheetFrame>
  );
}
