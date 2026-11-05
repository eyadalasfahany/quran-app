import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, Icon, UiText, useContrastColors } from '@/shared/ui';

import { MiniPlayerChevron } from './MiniPlayerChevron';

const INFO = { ios: 'info.circle', android: 'info' } as const;
// The frame's column and row gaps: 10 between the rows, 12 between the info tile and the message.
const COLUMN_GAP = 10;
const ROW_GAP = 12;
const INFO_TILE_SIZE = 46;
const INFO_TILE_RADIUS = 12;
const INFO_GLYPH_SIZE = 22;
// The chevron sits in the 24 pt top padding. The row, with a 10 pt slop each way, is 44 pt and collapses the bar.
const CHEVRON_ROW_HEIGHT = 24;

// The reader's bar while a play found no audio for the surah with the reciter (#ReadingMiniUnavailable, ADR 0062).
// It has no play button and no progress line: the notice and «تغيير القارئ» are the whole of it. The chevron row
// collapses the bar, like the playing bar's drag does, and the collapse action carries the same meaning.
export function ReaderMiniUnavailable({
  message,
  onChangeReciter,
  onCollapse,
}: {
  message: string;
  onChangeReciter: () => void;
  onCollapse: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const collapseLabel = t('player.minimize');

  return (
    <GlassSurface
      radius="lg"
      style={{
        gap: COLUMN_GAP,
        paddingBottom: 12,
        paddingEnd: 12,
        paddingStart: 12,
        paddingTop: 24,
      }}
      testID="mini-player-reader-unavailable"
    >
      <Pressable
        accessibilityActions={[{ label: collapseLabel, name: 'collapse' }]}
        accessibilityLabel={collapseLabel}
        accessibilityRole="button"
        hitSlop={{ bottom: 10, top: 10 }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'collapse') {
            onCollapse();
          }
        }}
        onPress={onCollapse}
        style={{ height: CHEVRON_ROW_HEIGHT, left: 0, position: 'absolute', right: 0, top: 0 }}
        testID="mini-player-unavailable-chevron"
      >
        <MiniPlayerChevron />
      </Pressable>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: ROW_GAP }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.fillSecondary,
            borderRadius: INFO_TILE_RADIUS,
            flexShrink: 0,
            height: INFO_TILE_SIZE,
            justifyContent: 'center',
            width: INFO_TILE_SIZE,
          }}
          testID="mini-player-unavailable-tile"
        >
          <Icon color={theme.colors.brand} name={INFO} size={INFO_GLYPH_SIZE} testID="mini-player-unavailable-icon" />
        </View>
        <UiText
          accessibilityLiveRegion="polite"
          role="status"
          scale="bar"
          style={{ flex: 1, minWidth: 0 }}
          variant="subhead"
          weight={600}
        >
          {message}
        </UiText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel={t('player.mini.changeReciter')}
          accessibilityRole="button"
          onPress={onChangeReciter}
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: colors.line,
            borderRadius: theme.radius.lg,
            borderWidth: theme.stroke.hairline,
            justifyContent: 'center',
            minHeight: theme.size.touchTarget,
            paddingHorizontal: 14,
          }}
          testID="mini-player-change-reciter"
        >
          <UiText scale="bar" tone="brand" variant="caption" weight={600}>
            {t('player.mini.changeReciter')}
          </UiText>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
