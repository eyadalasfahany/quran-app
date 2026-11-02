import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useWindowClass, windowClassFor, type WindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { timing } from '@/core/theme/motion';
import { MINI_PLAYER_SIDE } from '@/features/audio/mini-player-metrics';

import { PANEL_INSET, panelPlacementFor, panelStripWidth, type PanelPlacement } from '../layout';
import { useReaderMiniFootprint } from '../useReaderMiniFootprint';
import { READER_TOOLBAR_CLEARANCE } from './ReaderToolbar';

// The scrim's fade: it starts at 0 and animates to 1 while shown, and jumps to its resting value when hidden.
function setScrimOpacity(opacity: SharedValue<number>, shown: boolean, reduceMotion: boolean) {
  if (!shown) {
    opacity.value = reduceMotion ? 1 : 0;
    return;
  }
  opacity.value = reduceMotion ? 1 : withTiming(1, timing('fast'));
}

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
  miniPlayer,
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
  // The reader's mini player bar, floated 28 above the bottom safe area. Passed only where the mode allows it.
  miniPlayer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width: measuredWidth, height: measuredHeight } = useWindowDimensions();
  const liveClass = useWindowClass();
  const resolvedWidth = width ?? measuredWidth;
  const resolvedClass = windowClass ?? (width === undefined ? liveClass : windowClassFor(width, measuredHeight));
  const placement = panelPlacementFor(resolvedWidth, resolvedClass);
  const showPanel = placement !== 'sheet' && panelOpen;
  const showScrim = placement === 'overlay' && showPanel;
  // The overlay's dimmed page fades in when it appears. Reduce Motion: it is drawn at full strength, with no fade.
  const reduceMotion = useReducedMotion();
  const scrimOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }), [scrimOpacity]);
  // The strip is reserved only while a docked panel is shown; a closed panel leaves the stage full width.
  const strip = placement === 'docked' && showPanel ? panelStripWidth() : 0;
  const mini = useReaderMiniFootprint();
  // The bar is drawn only when it was passed and the shared footprint says it shows. The resume pill sits above it.
  const miniShown = Boolean(miniPlayer) && mini.shown;
  const resumeBottom = miniShown ? mini.bottom + mini.height + theme.space[2] : theme.space[4];

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
    setScrimOpacity(scrimOpacity, showScrim, reduceMotion);
  }, [scrimOpacity, showScrim, reduceMotion]);

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
      {/* Logical margins and insets: the panel sits on the trailing edge in both directions. */}
      <View
        style={{
          flex: 1,
          marginEnd: strip,
        }}
        testID="reader-stage"
      >
        <View style={{ flex: 1 }}>
          {children}
          {resume ? (
            <View
              pointerEvents="box-none"
              style={{ alignItems: 'center', bottom: resumeBottom, left: 0, position: 'absolute', right: 0 }}
              testID="reader-resume-slot"
            >
              {resume}
            </View>
          ) : null}
        </View>
        {/* The bar floats above this slot, outside its bounds; Android must not clip it. */}
        <View style={{ height: bottomInset, overflow: 'visible' }} testID="reader-mini-player-slot">
          {miniPlayer ? (
            <View
              pointerEvents="box-none"
              style={{
                bottom: bottomInset + mini.bottom,
                end: MINI_PLAYER_SIDE,
                position: 'absolute',
                start: MINI_PLAYER_SIDE,
              }}
              testID="reader-mini-player-dock"
            >
              {miniPlayer}
            </View>
          ) : null}
        </View>
      </View>
      {showScrim ? (
        <Pressable
          accessibilityLabel={t('reader.panel.dismiss')}
          onPress={onCloseOverlay}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          testID="reader-overlay-scrim"
        >
          <Animated.View
            style={[
              { backgroundColor: theme.colors.scrim, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
              scrimStyle,
            ]}
            testID="reader-overlay-scrim-fill"
          />
        </Pressable>
      ) : null}
      {showPanel ? (
        <View
          accessibilityViewIsModal={placement === 'overlay'}
          style={{
            bottom: bottomInset + PANEL_INSET,
            position: 'absolute',
            // Overlay: the panel starts below the toolbar row, so the toolbar pill does not sit on its header.
            top: topInset + (placement === 'overlay' ? READER_TOOLBAR_CLEARANCE : 0) + PANEL_INSET,
            end: PANEL_INSET,
            width: theme.size.sidePanel,
            // Overlay only: a solid raised card, so the dimmed page does not tint the glass panel.
            ...(placement === 'overlay'
              ? {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderRadius: theme.radius.xl,
                  boxShadow: theme.shadows.glass,
                }
              : null),
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
