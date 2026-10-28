import { View, Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

export type DownloadRowState = 'available' | 'downloading' | 'installed';

export type DownloadRowActionLabels = {
  download: string;
  cancel: string;
  open: string;
};

// One row of a download list: available shows the download pill, downloading shows the stop button
// and a progress bar under the subtitle, installed shows the open pill.
export function DownloadRow({
  title,
  subtitle,
  state,
  progress = 0,
  onDownload,
  onCancel,
  onOpen,
  actionLabels,
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
  actionLabels: DownloadRowActionLabels;
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
          accessibilityLabel={actionLabels.cancel}
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
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={isInstalled ? onOpen : onDownload}
        style={({ pressed }) => [pillStyle, { opacity: pressed ? theme.opacity.pressed : 1 }]}
        testID={testID ? `${testID}-action` : undefined}
      >
        <UiText tone="brand" variant="caption" weight={600}>
          {label}
        </UiText>
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
    </View>
  );
}
