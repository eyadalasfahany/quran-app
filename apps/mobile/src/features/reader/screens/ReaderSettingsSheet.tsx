import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { SheetHeader } from '@/shared/ui';

import { SheetFrame } from '../components/SheetFrame';
import { useReaderSettings } from '../settings';
import { FontScaleStepper } from '../settings/components/FontScaleStepper';
import { ModePicker } from '../settings/components/ModePicker';
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
  const setMode = useReaderSettings((state) => state.setMode);
  const setFontScale = useReaderSettings((state) => state.setFontScale);

  return (
    <SheetFrame grabber="muted" testID="reader-settings-sheet">
      <View style={{ paddingHorizontal: SHEET_PADDING_H, paddingTop: SHEET_PADDING_TOP }}>
        <SheetHeader
          closeLabel={t('reader.settings.close')}
          closeTone="track"
          onClose={() => router.back()}
          size="large"
          testID="reader-settings"
          title={t('reader.settings.title')}
        />
      </View>
      <ScrollView
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
          <ModePicker onChange={setMode} value={mode} />
        </SettingsSection>
        <SettingsSection label={t('reader.settings.themeLabel')}>
          <ThemePicker />
        </SettingsSection>
        <SettingsSection label={t('reader.settings.fontScale')} layout="inline">
          <FontScaleStepper onChange={setFontScale} value={fontScale} />
        </SettingsSection>
      </ScrollView>
    </SheetFrame>
  );
}
