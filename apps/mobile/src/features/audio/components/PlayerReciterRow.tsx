import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

import { CHECK_ICON } from './player-icons';
import { PlayerReciterStyleTag } from './PlayerReciterStyleTag';
import { PlayerReciterTile } from './PlayerReciterTile';

export type PlayerReciterRowState = 'current' | 'installed' | 'notDownloaded' | 'downloading' | 'unavailable';

// The frame's row metrics that no token matches: the row's minimum height and its inset from the edges.
const ROW_MIN_HEIGHT = 56;
const ROW_INSET = 6;
const NAME_GAP = 2;
const DOWNLOAD_ICON = { ios: 'arrow.down.to.line', android: 'download' } as const satisfies IconName;
const ACTION_ICON_SIZE = 22;

// One reciter in the player's list (quran-app-screens.html, #PlayerReciters and #PlayerReciterDownloading). The
// player is always dark, so every colour is a player token. The row composes the tile, the name, the style tag and
// the status line the list passes in. Only `current` and `installed` are pressable; `notDownloaded` and `downloading`
// act through their button; `unavailable` is inert.
export function PlayerReciterRow({
  name,
  letter,
  state,
  styleLabel,
  statusLabel,
  progress = 0,
  playing = false,
  showDivider = true,
  onSelect,
  onDownload,
  onCancel,
  testID,
}: {
  name: string;
  letter: string;
  state: PlayerReciterRowState;
  /** The style tag, or null when the reciter has none (and for `unavailable`). */
  styleLabel: string | null;
  /** The status line the list composed for this state. */
  statusLabel: string | null;
  /** 0 to 1, `downloading` only. */
  progress?: number;
  /** The current reciter is playing: the row's hint says so. */
  playing?: boolean;
  showDivider?: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isCurrent = state === 'current';
  const isInstalled = state === 'installed';
  const isUnavailable = state === 'unavailable';
  const nameColor = isUnavailable ? theme.colors.playerMuted : theme.colors.playerInk;
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  const content = (
    <>
      <PlayerReciterTile dimmed={isUnavailable} letter={letter} selected={isCurrent} testID={testID ? `${testID}-tile` : undefined} />
      <View style={{ flex: 1, gap: NAME_GAP, minWidth: 0 }}>
        <UiText style={{ color: nameColor }} variant="headline">
          {name}
        </UiText>
        {styleLabel !== null || statusLabel !== null ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.size.chipGap }}>
            {styleLabel !== null ? (
              <PlayerReciterStyleTag label={styleLabel} testID={testID ? `${testID}-style` : undefined} />
            ) : null}
            {statusLabel !== null ? (
              <UiText
                style={{ color: theme.colors.playerMuted }}
                testID={testID ? `${testID}-status` : undefined}
                variant="label"
                weight={400}
              >
                {statusLabel}
              </UiText>
            ) : null}
          </View>
        ) : null}
        {state === 'downloading' ? (
          <View
            accessible
            accessibilityLabel={name}
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{
              backgroundColor: theme.colors.playerLine,
              borderRadius: theme.radius.progress,
              flexDirection: 'row',
              height: theme.size.progressHeight,
              marginTop: theme.size.progressGap,
              overflow: 'hidden',
            }}
            testID={testID ? `${testID}-progress` : undefined}
          >
            {/* Row direction is the layout direction, so the fill starts at the leading edge (right in Arabic). */}
            <View
              style={{
                backgroundColor: theme.colors.goldOnBrandSurface,
                borderRadius: theme.radius.progress,
                height: theme.size.progressHeight,
                width: `${percent}%`,
              }}
              testID={testID ? `${testID}-progress-fill` : undefined}
            />
          </View>
        ) : null}
      </View>
      {isCurrent ? (
        <Icon
          color={theme.colors.playerAccent}
          name={CHECK_ICON}
          size={ACTION_ICON_SIZE}
          testID={testID ? `${testID}-check` : undefined}
        />
      ) : null}
    </>
  );

  const contentStyle = {
    alignItems: 'center' as const,
    flex: 1,
    flexDirection: 'row' as const,
    gap: theme.space[3],
    minHeight: ROW_MIN_HEIGHT,
    minWidth: 0,
  };

  const body = (() => {
    if (isCurrent || isInstalled) {
      return (
        <Pressable
          accessibilityHint={isCurrent && playing ? t('player.nowPlaying') : undefined}
          accessibilityLabel={t(isCurrent ? 'player.reciters.a11yCurrent' : 'player.reciters.a11ySwitch', { name })}
          accessibilityRole="radio"
          accessibilityState={{ checked: isCurrent }}
          // The current reciter is already selected, so it has no press.
          onPress={isInstalled ? onSelect : undefined}
          style={({ pressed }) => [contentStyle, { opacity: pressed ? theme.opacity.pressed : 1 }]}
          testID={testID ? `${testID}-select` : undefined}
        >
          {content}
        </Pressable>
      );
    }
    if (isUnavailable) {
      return (
        <View
          accessible
          accessibilityHint={statusLabel ?? undefined}
          accessibilityLabel={name}
          accessibilityState={{ disabled: true }}
          style={contentStyle}
        >
          {content}
        </View>
      );
    }
    return <View style={contentStyle}>{content}</View>;
  })();

  const action = (() => {
    if (state === 'notDownloaded') {
      return (
        <Pressable
          accessibilityLabel={t('common.a11yAction', { action: t('ui.download.start'), title: name })}
          accessibilityRole="button"
          onPress={onDownload}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              backgroundColor: theme.colors.playerGlassFill,
              borderColor: theme.colors.playerLine,
              borderRadius: theme.size.touchTarget / 2,
              borderWidth: theme.stroke.hairline,
              height: theme.size.touchTarget,
              justifyContent: 'center',
              opacity: pressed ? theme.opacity.pressed : 1,
              width: theme.size.touchTarget,
            },
          ]}
          testID={testID ? `${testID}-action` : undefined}
        >
          <Icon color={theme.colors.playerAccent} name={DOWNLOAD_ICON} size={ACTION_ICON_SIZE} />
        </Pressable>
      );
    }
    if (state === 'downloading') {
      return (
        <Pressable
          accessibilityLabel={t('common.a11yAction', { action: t('ui.download.cancel'), title: name })}
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              backgroundColor: theme.colors.playerGlassFill,
              borderColor: theme.colors.playerLine,
              borderRadius: theme.size.touchTarget / 2,
              borderWidth: theme.stroke.hairline,
              height: theme.size.touchTarget,
              justifyContent: 'center',
              opacity: pressed ? theme.opacity.pressed : 1,
              width: theme.size.touchTarget,
            },
          ]}
          testID={testID ? `${testID}-action` : undefined}
        >
          <View
            style={{
              backgroundColor: theme.colors.playerInk,
              borderRadius: theme.radius.glyph,
              height: theme.size.stopGlyph,
              width: theme.size.stopGlyph,
            }}
          />
        </Pressable>
      );
    }
    return null;
  })();

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: theme.colors.playerLine,
        borderBottomWidth: showDivider ? theme.stroke.hairline : 0,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: ROW_MIN_HEIGHT,
        paddingHorizontal: ROW_INSET,
      }}
      testID={testID}
    >
      {body}
      {action}
    </View>
  );
}
