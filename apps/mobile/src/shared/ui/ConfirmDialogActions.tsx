import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/core/theme';

import { ConfirmDialogButton } from './ConfirmDialogButton';
import { UiText } from './UiText';

type LabelKey = 'cancel' | 'confirm';

/**
 * Whether two equal-width buttons, each with its label and horizontal padding, fit in a row of `rowWidth`.
 * The buttons are equal width, so the wider label decides.
 */
export function fitsSideBySide(rowWidth: number, labelWidths: readonly number[], gap: number, paddingX: number): boolean {
  const eachWidth = (rowWidth - gap) / 2;
  return Math.max(...labelWidths) + 2 * paddingX <= eachWidth;
}

/**
 * The dialog's two buttons: Cancel at the reading start and the confirm action at the end, equal width, side by side.
 * When the labels do not fit that way (a long English label, a large Dynamic Type size), the buttons stack full width,
 * with the confirm action on top. Without a cancel label the single confirm button is full width.
 *
 * The labels are measured in a hidden layer that is always laid out side by side, so stacking never changes the
 * measurement and cannot flip back and forth.
 */
export function ConfirmDialogActions({
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
  testID,
}: {
  confirmLabel: string;
  cancelLabel?: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const [labelWidths, setLabelWidths] = useState<Partial<Record<LabelKey, number>>>({});

  const measured = labelWidths.cancel !== undefined && labelWidths.confirm !== undefined;
  const stacked =
    cancelLabel !== undefined &&
    rowWidth !== null &&
    measured &&
    !fitsSideBySide(rowWidth, [labelWidths.cancel ?? 0, labelWidths.confirm ?? 0], theme.space[3], theme.space[4]);
  const vertical = stacked || cancelLabel === undefined;

  const recordWidth = (key: LabelKey) => (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setLabelWidths((previous) => (previous[key] === width ? previous : { ...previous, [key]: width }));
  };

  const confirm = (
    <ConfirmDialogButton
      key="confirm"
      label={confirmLabel}
      onPress={onConfirm}
      style={vertical ? styles.fullWidth : styles.share}
      testID={`${testID}-confirm`}
      tone={destructive ? 'destructive' : 'brand'}
    />
  );
  const cancel = cancelLabel ? (
    <ConfirmDialogButton
      key="cancel"
      label={cancelLabel}
      onPress={onCancel}
      style={vertical ? styles.fullWidth : styles.share}
      testID={`${testID}-cancel`}
      tone="neutral"
    />
  ) : null;

  return (
    <>
      <View
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: vertical ? 'column' : 'row', gap: theme.space[3] }}
        testID={`${testID}-actions`}
      >
        {/* A row is mirrored under RTL, so the cancel button, listed first, sits at the reading start. Stacked, the confirm action comes first. */}
        {vertical ? confirm : null}
        {cancel}
        {vertical ? null : confirm}
      </View>
      {cancelLabel !== undefined ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.measure}
          testID={`${testID}-measure`}
        >
          <View onLayout={recordWidth('cancel')} style={styles.measureItem} testID={`${testID}-measure-cancel`}>
            <UiText variant="headline" weight={600}>
              {cancelLabel}
            </UiText>
          </View>
          <View onLayout={recordWidth('confirm')} style={styles.measureItem} testID={`${testID}-measure-confirm`}>
            <UiText variant="headline" weight={600}>
              {confirmLabel}
            </UiText>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  share: { flex: 1 },
  measure: { left: 0, opacity: 0, position: 'absolute', top: 0 },
  measureItem: { alignSelf: 'flex-start' },
});
