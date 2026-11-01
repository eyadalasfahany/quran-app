import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useIsShortWindow } from '@/core/layout/useWindowClass';
import { useTheme } from '@/core/theme';
import { AzkarTapSurface } from '@/features/azkar/components/AzkarTapSurface';
import { azkarHref, goBackOr } from '@/features/azkar/routes';
import { ConfirmDialog, Screen } from '@/shared/ui';

import { isPresetTarget, toggleTarget } from '../data/model';
import { sibhaRingSize } from '../data/ring-layout';
import { useSibha } from '../hooks/useSibha';
import { SibhaCounter } from '../components/SibhaCounter';
import { SibhaCustomTargetSheet } from '../components/SibhaCustomTargetSheet';
import { SibhaHint } from '../components/SibhaHint';
import { SibhaLabelField } from '../components/SibhaLabelField';
import { SibhaTargetChips, type SibhaChoice } from '../components/SibhaTargetChips';
import { SibhaTopBar } from '../components/SibhaTopBar';

type Area = { width: number; height: number };
const NO_AREA: Area = { width: 0, height: 0 };

const RESET_ICON = { ios: 'arrow.counterclockwise', android: 'restart_alt' } as const;

/**
 * The misbaha (quran-app-screens.html, #Sibha): a full-screen counter. A tap anywhere that is not a button counts; the
 * top row closes and resets; the chips set the target (or «بلا حد», no limit); the label is the user's own. Reset asks
 * first, in the shared ConfirmDialog. No phrase is supplied (ADR 0034 §4). Composition only: the counter, its state and
 * the sheets are in their own files.
 *
 * The ring is sized to the space it gets (ADR 0036). In a short window (a landscape phone) the chips and hint move beside
 * the counter, so the screen fits without scrolling. Side insets come from the Screen root.
 */
export function SibhaScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useScreenInsets();
  const short = useIsShortWindow();
  const sibha = useSibha();
  // The hook returns a fresh object each render, so its fields are taken apart: the callbacks and values below keep
  // their identity between taps, and the memoised sections below do not re-render when the count changes.
  const { chooseTarget, count, label, rounds, setLabel, tap, target } = sibha;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [area, setArea] = useState<Area>(NO_AREA);
  const onArea = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const ringSize = sibhaRingSize(Math.min(area.width, area.height));

  const openReset = useCallback(() => setResetOpen(true), []);
  const closeScreen = useCallback(() => goBackOr(azkarHref.homeTab), []);

  const choose = useCallback(
    (choice: SibhaChoice) => {
      if (choice === 'custom') {
        setSheetOpen(true);
        return;
      }
      if (choice === 'none') {
        chooseTarget(null);
        return;
      }
      chooseTarget(toggleTarget(target, choice));
    },
    [chooseTarget, target],
  );

  // Memoised elements: React skips an element that is the same object as last render, so a tap re-renders the counter
  // alone.
  const topBar = useMemo(() => <SibhaTopBar onClose={closeScreen} onReset={openReset} />, [closeScreen, openReset]);
  const labelField = useMemo(() => <SibhaLabelField onChangeText={setLabel} value={label} />, [label, setLabel]);
  const targets = useMemo(
    () => (
      <>
        <SibhaTargetChips onChoose={choose} target={target} />
        <SibhaHint />
      </>
    ),
    [choose, target],
  );

  const counter = (
    <View onLayout={onArea} style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }} testID="sibha-counter-area">
      <SibhaCounter count={count} onReset={openReset} onTap={tap} rounds={rounds} size={ringSize} target={target} />
    </View>
  );

  return (
    <Screen testID="screen-sibha">
      <AzkarTapSurface
        onTap={tap}
        style={{
          flex: 1,
          gap: theme.space[5],
          paddingBottom: insets.bottom + theme.space[4],
          paddingHorizontal: theme.space[4],
          paddingTop: theme.space[3],
        }}
        testID="sibha-tap-surface"
      >
        {topBar}
        {labelField}
        {short ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: theme.space[5] }} testID="sibha-row">
            {counter}
            <View style={{ flex: 1, gap: theme.space[5], justifyContent: 'center' }}>{targets}</View>
          </View>
        ) : (
          <>
            {counter}
            {targets}
          </>
        )}
      </AzkarTapSurface>
      <SibhaCustomTargetSheet
        initialValue={isPresetTarget(sibha.target) ? null : sibha.target}
        onClose={() => setSheetOpen(false)}
        onSave={(value) => {
          sibha.chooseTarget(value);
          setSheetOpen(false);
        }}
        visible={sheetOpen}
      />
      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('sibha.resetConfirm')}
        destructive
        icon={RESET_ICON}
        message={t('sibha.resetBody')}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          sibha.reset();
          setResetOpen(false);
        }}
        testID="sibha-reset-dialog"
        title={t('sibha.resetTitle')}
        visible={resetOpen}
      />
    </Screen>
  );
}
