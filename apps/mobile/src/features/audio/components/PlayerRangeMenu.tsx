import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useSlideUp, useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { usePlayerSheetExit } from '../hooks/usePlayerSheetExit';
import { useSurahVerses, type SurahVerse } from '../hooks/useSurahVerses';
import { setRepeat } from '../player';
import { usePlayerStore } from '../playerStore';
import { PlayerChoiceRow } from './PlayerChoiceRow';
import { PlayerOverlay } from './PlayerOverlay';

// The longest list shown before it scrolls: about six rows.
const LIST_MAX_HEIGHT = 264;

// The ayah range for the repeat, picked from the current surah. Opens on the recited ayah, or on the range already set.
// «تم» sets it with the current count (or 1); from is never after to, so choosing a start after the end moves the end.
export function PlayerRangeMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useSlideUp();
  const exit = usePlayerSheetExit(onClose);
  const { dismiss } = exit;
  const chapterId = usePlayerStore((state) => state.chapterId);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const repeat = usePlayerStore((state) => state.repeat);
  const verses = useSurahVerses(chapterId);
  const [from, setFrom] = useState<number | null>(repeat?.fromVerseId ?? activeVerseId);
  const [to, setTo] = useState<number | null>(repeat?.toVerseId ?? activeVerseId);
  const card = {
    backgroundColor: theme.colors.playerBg,
    borderColor: theme.colors.playerLine,
    borderRadius: theme.radius.lg,
    borderWidth: theme.stroke.hairline,
    overflow: 'hidden' as const,
  };

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [dismiss, visible]);

  if (!visible) {
    return null;
  }

  const ayahLabel = (verse: SurahVerse) => t('ui.ayahNumber', { number: formatNumber(verse.number, locale) });
  const pickFrom = (id: number) => {
    setFrom(id);
    if (to === null || to < id) {
      setTo(id);
    }
  };
  const canApply = from !== null && to !== null;
  const apply = () => {
    if (from !== null && to !== null) {
      setRepeat({ fromVerseId: from, toVerseId: to, count: repeat?.count ?? 1 });
    }
    exit.dismiss();
  };

  return (
    <PlayerOverlay>
      <View style={styles.root} testID="player-range-menu-overlay">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, exit.scrimStyle]}>
          <Pressable accessible={false} onPress={exit.dismiss} style={StyleSheet.absoluteFill} testID="player-range-menu-scrim" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          entering={slide.entering}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.space[2]) }, exit.sheetStyle]}
          testID="player-range-menu"
        >
          <View style={card}>
            <View style={{ paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] }}>
              <UiText accessibilityRole="header" style={{ color: theme.colors.playerMuted }} variant="label" weight={500}>
                {t('player.range.title')}
              </UiText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={styles.column}>
                <UiText style={{ color: theme.colors.playerMuted, paddingHorizontal: theme.space[4], paddingBottom: theme.space[1], paddingTop: theme.space[2] }} variant="label" weight={500}>
                  {t('player.range.from')}
                </UiText>
                <ScrollView accessibilityLabel={t('player.range.from')} style={{ maxHeight: LIST_MAX_HEIGHT }}>
                  {verses.map((verse) => (
                    <PlayerChoiceRow
                      checked={verse.id === from}
                      key={`from-${verse.id}`}
                      label={ayahLabel(verse)}
                      onPress={() => pickFrom(verse.id)}
                      testID={`player-range-from-${verse.id}`}
                    />
                  ))}
                </ScrollView>
              </View>
              <View style={{ backgroundColor: theme.colors.playerLine, width: theme.stroke.hairline }} />
              <View style={styles.column}>
                <UiText style={{ color: theme.colors.playerMuted, paddingHorizontal: theme.space[4], paddingBottom: theme.space[1], paddingTop: theme.space[2] }} variant="label" weight={500}>
                  {t('player.range.to')}
                </UiText>
                <ScrollView accessibilityLabel={t('player.range.to')} style={{ maxHeight: LIST_MAX_HEIGHT }}>
                  {verses.map((verse) => (
                    <PlayerChoiceRow
                      checked={verse.id === to}
                      disabled={from !== null && verse.id < from}
                      key={`to-${verse.id}`}
                      label={ayahLabel(verse)}
                      onPress={() => setTo(verse.id)}
                      testID={`player-range-to-${verse.id}`}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
          <View style={[card, { flexDirection: 'row' }]}>
            <Pressable
              accessibilityLabel={t('player.menu.cancel')}
              accessibilityRole="button"
              onPress={exit.dismiss}
              style={({ pressed }) => [styles.action, { minHeight: theme.size.touchTarget, backgroundColor: pressed ? theme.colors.playerGlassFill : 'transparent' }]}
              testID="player-range-menu-cancel"
            >
              <UiText style={{ color: theme.colors.playerAccent }} variant="headline" weight={400}>
                {t('player.menu.cancel')}
              </UiText>
            </Pressable>
            <Pressable
              accessibilityLabel={t('player.range.done')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canApply }}
              disabled={!canApply}
              onPress={apply}
              style={({ pressed }) => [styles.action, { minHeight: theme.size.touchTarget, backgroundColor: pressed ? theme.colors.playerGlassFill : 'transparent' }]}
              testID="player-range-menu-done"
            >
              <UiText style={{ color: canApply ? theme.colors.playerAccent : theme.colors.playerMuted }} variant="headline" weight={600}>
                {t('player.range.done')}
              </UiText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </PlayerOverlay>
  );
}

const styles = StyleSheet.create({
  root: { bottom: 0, justifyContent: 'flex-end', left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { gap: 8, paddingHorizontal: 8 },
  column: { flex: 1 },
  action: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
