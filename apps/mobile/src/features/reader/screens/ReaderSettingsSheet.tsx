import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSvgMushafPack } from '@/core/mushaf-pack';
import { discoverIdForMode } from '@/features/discover/reader-modes';
import { markDiscovered } from '@/features/discover/store';
import { SheetHeader, UiText } from '@/shared/ui';

import { SheetFrame } from '../components/SheetFrame';
import { SheetScrollView } from '../components/SheetScrollView';
import { useSheet } from '../components/sheet-context';
import { effectiveZoom, zoomAvailable } from '../mushaf-svg/mushaf-zoom';
import { useChosenMushafKey } from '../mushaf-svg/useChosenMushafKey';
import { useReaderSettings } from '../settings';
import { FontScaleStepper } from '../settings/components/FontScaleStepper';
import { MushafPicker } from '../components/MushafPicker';
import { ModePicker } from '../settings/components/ModePicker';
import { MushafZoomStepper } from '../settings/components/MushafZoomStepper';
import { SECTION_STACK_GAP, SettingsSection } from '../settings/components/SettingsSection';
import { ThemePicker } from '../settings/components/ThemePicker';

/** Sheet card padding and gaps on the settings frame (screens/: padding 10px 18px 20px; gap 14px). */
const SHEET_PADDING_H = 18;
const SHEET_PADDING_TOP = 14;
const SHEET_PADDING_BOTTOM = 20;
const SHEET_GAP = 14;

export function ReaderSettingsSheet() {
  const { t } = useTranslation();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const mushafZoom = useReaderSettings((state) => state.mushafZoom);
  const mushaf = useReaderSettings((state) => state.mushaf);
  const setMode = useReaderSettings((state) => state.setMode);
  const setFontScale = useReaderSettings((state) => state.setFontScale);
  const setMushafZoom = useReaderSettings((state) => state.setMushafZoom);
  const setMushaf = useReaderSettings((state) => state.setMushaf);
  const sheet = useSheet();
  // The zoom control is for the riwayah the reader chose: its pack says whether word data allows zoom.
  const chosenMushaf = useChosenMushafKey();
  const zoomOn = zoomAvailable(useSvgMushafPack(chosenMushaf).reader);

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
        {mode === 'mushaf' ? (
          // The hint sits under the row, not in it (frame ReaderSettingsMushafZoomUnavailable): inline it overflowed the sheet.
          <View style={{ gap: SECTION_STACK_GAP }}>
            <SettingsSection label={t('reader.settings.mushafZoom')} layout="inline">
              <MushafZoomStepper disabled={!zoomOn} onChange={setMushafZoom} value={effectiveZoom(mushafZoom, zoomOn)} />
            </SettingsSection>
            {zoomOn ? null : (
              <UiText testID="reader-mushaf-zoom-unavailable" tone="muted" variant="caption">
                {t('reader.settings.mushafZoomUnavailable')}
              </UiText>
            )}
          </View>
        ) : (
          <SettingsSection label={t('reader.settings.fontScale')} layout="inline">
            <FontScaleStepper onChange={setFontScale} value={fontScale} />
          </SettingsSection>
        )}
        <SettingsSection label={t('reader.settings.mushaf')}>
          <MushafPicker accessibilityLabel={t('reader.mushafs.group')} onChange={setMushaf} value={mushaf} />
        </SettingsSection>
      </SheetScrollView>
    </SheetFrame>
  );
}
