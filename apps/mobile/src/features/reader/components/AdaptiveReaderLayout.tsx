import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, View, useWindowDimensions } from 'react-native';

import { useWindowClass, windowClassFor, type WindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';

import { PANEL_INSET, panelPlacementFor, panelStripWidth, type PanelPlacement } from '../layout';

export function AdaptiveReaderLayout({
  width,
  windowClass,
  verseKey,
  panelOpen,
  topInset = 0,
  bottomInset = 0,
  onMoveToSheet,
  onMoveToPanel,
  onCloseOverlay,
  toolbar,
  panel,
  resume,
  children,
}: {
  width?: number;
  windowClass?: WindowClass;
  verseKey: string | null;
  panelOpen: boolean;
  topInset?: number;
  bottomInset?: number;
  onMoveToSheet: (verseKey: string) => void;
  onMoveToPanel: (verseKey: string) => void;
  onCloseOverlay: () => void;
  toolbar?: ReactNode;
  panel?: ReactNode;
  // Floats centred at the bottom of the reading stage, above the mini player.
  resume?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const measuredWidth = useWindowDimensions().width;
  const liveClass = useWindowClass();
  const resolvedWidth = width ?? measuredWidth;
  const resolvedClass = windowClass ?? (width === undefined ? liveClass : windowClassFor(width));
  const placement = panelPlacementFor(resolvedWidth, resolvedClass);
  const showPanel = placement !== 'sheet' && panelOpen;
  const rtl = I18nManager.isRTL;
  const strip = placement === 'docked' ? panelStripWidth() : 0;
  const trailing = rtl ? 'left' : 'right';

  const placementRef = useRef<PanelPlacement | null>(null);
  const verseKeyRef = useRef(verseKey);
  const onSheetRef = useRef(onMoveToSheet);
  const onPanelRef = useRef(onMoveToPanel);

  useEffect(() => {
    verseKeyRef.current = verseKey;
    onSheetRef.current = onMoveToSheet;
    onPanelRef.current = onMoveToPanel;
  });

  useEffect(() => {
    const from = placementRef.current;
    placementRef.current = placement;
    if (from === null || from === placement) {
      return;
    }
    const key = verseKeyRef.current;
    if (key === null) {
      return;
    }
    if (placement === 'sheet') {
      onSheetRef.current(key);
      return;
    }
    if (from === 'sheet') {
      onPanelRef.current(key);
    }
  }, [placement]);

  return (
    <View style={{ flex: 1 }} testID={`reader-layout-${placement}`}>
      <View
        style={{
          flex: 1,
          marginLeft: rtl ? strip : 0,
          marginRight: rtl ? 0 : strip,
        }}
        testID="reader-stage"
      >
        <View style={{ flex: 1 }}>
          {children}
          {resume ? (
            <View
              pointerEvents="box-none"
              style={{ alignItems: 'center', bottom: theme.space[4], left: 0, position: 'absolute', right: 0 }}
              testID="reader-resume-slot"
            >
              {resume}
            </View>
          ) : null}
        </View>
        <View testID="reader-mini-player-slot" style={{ height: bottomInset }} />
      </View>
      {placement === 'overlay' && showPanel ? (
        <Pressable
          accessibilityLabel={t('reader.panel.dismiss')}
          onPress={onCloseOverlay}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          testID="reader-overlay-scrim"
        />
      ) : null}
      {showPanel ? (
        <View
          accessibilityViewIsModal={placement === 'overlay'}
          style={{
            bottom: bottomInset + PANEL_INSET,
            position: 'absolute',
            top: topInset + PANEL_INSET,
            width: theme.size.sidePanel,
            [trailing]: PANEL_INSET,
          }}
          testID="reader-panel-host"
        >
          {panel}
        </View>
      ) : null}
      <View pointerEvents="box-none" style={{ left: 0, position: 'absolute', right: 0, top: 0 }}>
        {toolbar}
      </View>
    </View>
  );
}
