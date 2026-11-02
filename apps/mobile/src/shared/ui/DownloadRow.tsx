import { StyleSheet, View, Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { BufferingRing } from './BufferingRing';
import { Icon } from './Icon';
import { UiText } from './UiText';
import { IconButton } from './IconButton';
import { useContrastColors } from './useContrastColors';

const ignoreTap = () => undefined;

// The pause glyph an installed row's open pill shows while its audio starts, inside a buffering ring.
const PAUSE_ICON = { ios: 'pause.fill', android: 'pause' } as const;
const PAUSE_GLYPH_SIZE = 16;
const PAUSE_RING_SIZE = 24;

export type DownloadRowState = 'available' | 'downloading' | 'installed';

export type DownloadRowActionLabels = {
  download: string;
  cancel: string;
  open: string;
  /** Needed only with `onDelete`. */
  delete?: string;
};

// The trash glyph for an installed row's delete button.
const DELETE_ICON = { ios: 'trash', android: 'delete' } as const;

// One row of a download list: available shows the download pill, downloading shows the stop button
// and a progress bar under the subtitle, installed shows the open pill and, with `onDelete`, a trailing delete button.
export function DownloadRow({
  title,
  subtitle,
  state,
  progress = 0,
  onDownload,
  onCancel,
  onOpen,
  onDelete,
  actionLabels,
  starting = false,
  showDivider = false,
  testID,
}: {
  title: string;
  subtitle?: string;
  state: DownloadRowState;
  /** 0 to 1. Only drawn while downloading. */
  progress?: number;
  onDownload?: () => void;
  onCancel?: () => void;
  onOpen?: () => void;
  /** Drawn for an installed row only. */
  onDelete?: () => void;
  actionLabels: DownloadRowActionLabels;
  /** This row's audio is starting: the open pill shows pause in a buffering ring, busy, and taps do nothing. */
  starting?: boolean;
  showDivider?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const barRadius = theme.radius.progress;
  const barHeight = theme.size.progressHeight;

  const pillStyle = {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: theme.stroke.hairline,
    justifyContent: 'center',
    minHeight: theme.size.touchTarget,
    minWidth: theme.size.touchTarget,
    paddingHorizontal: theme.space[3],
  } as const;

  const action = (() => {
    if (state === 'downloading') {
      return (
        <Pressable
          accessibilityLabel={`${actionLabels.cancel} ${title}`}
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: colors.line,
              borderRadius: theme.size.touchTarget / 2,
              borderWidth: theme.stroke.hairline,
              height: theme.size.touchTarget,
              justifyContent: 'center',
              width: theme.size.touchTarget,
              opacity: pressed ? theme.opacity.pressed : 1,
            },
          ]}
          testID={testID ? `${testID}-action` : undefined}
        >
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: theme.radius.glyph,
              height: theme.size.stopGlyph,
              width: theme.size.stopGlyph,
            }}
          />
        </Pressable>
      );
    }

    const isInstalled = state === 'installed';
    const label = isInstalled ? actionLabels.open : actionLabels.download;
    // Only the open pill starts audio, so only it shows the start.
    const buffering = isInstalled && starting;
    return (
      <Pressable
        // Every row has the same actions, so each says which row it acts on («تنزيل البقرة»).
        accessibilityLabel={`${label} ${title}`}
        accessibilityRole="button"
        accessibilityState={buffering ? { busy: true } : undefined}
        onPress={buffering ? ignoreTap : isInstalled ? onOpen : onDownload}
        style={({ pressed }) => [pillStyle, { opacity: pressed ? theme.opacity.pressed : 1 }]}
        testID={testID ? `${testID}-action` : undefined}
      >
        {/* The text keeps its place while the pill shows the start, so the pill keeps its exact size. */}
        <UiText style={buffering ? { opacity: 0 } : undefined} tone="brand" variant="caption" weight={600}>
          {label}
        </UiText>
        {buffering ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <BufferingRing
              active
              color={theme.colors.brand}
              size={PAUSE_RING_SIZE}
              testID={testID ? `${testID}-buffering` : undefined}
            >
              <View style={{ alignItems: 'center', height: PAUSE_RING_SIZE, justifyContent: 'center', width: PAUSE_RING_SIZE }}>
                <Icon
                  color={theme.colors.brand}
                  name={PAUSE_ICON}
                  size={PAUSE_GLYPH_SIZE}
                  testID={testID ? `${testID}-pause` : undefined}
                />
              </View>
            </BufferingRing>
          </View>
        ) : null}
      </Pressable>
    );
  })();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: theme.size.downloadRowMinHeight,
          paddingHorizontal: theme.size.downloadRowInset,
        },
        showDivider ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline } : null,
      ]}
      testID={testID}
    >
      <View style={{ flex: 1 }}>
        <UiText variant="headline">{title}</UiText>
        {subtitle ? (
          <UiText tone="muted" variant="label" weight={400}>
            {subtitle}
          </UiText>
        ) : null}
        {state === 'downloading' ? (
          <View
            accessible
            accessibilityLabel={title}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{
              backgroundColor: colors.fillSecondary,
              borderRadius: barRadius,
              flexDirection: 'row',
              height: barHeight,
              marginTop: theme.size.progressGap,
              overflow: 'hidden',
            }}
          >
            {/* Row direction is the layout direction, so the fill starts at the leading edge: right in Arabic, left in English. */}
            <View
              style={{
                backgroundColor: theme.colors.brand,
                borderRadius: barRadius,
                height: barHeight,
                width: `${percent}%`,
              }}
              testID={testID ? `${testID}-progress-fill` : undefined}
            />
          </View>
        ) : null}
      </View>
      {action}
      {state === 'installed' && onDelete !== undefined && actionLabels.delete !== undefined ? (
        <IconButton
          icon={DELETE_ICON}
          iconSize={20}
          label={`${actionLabels.delete} ${title}`}
          onPress={onDelete}
          testID={testID ? `${testID}-delete` : undefined}
          tone="muted"
          variant="raised"
        />
      ) : null}
    </View>
  );
}
