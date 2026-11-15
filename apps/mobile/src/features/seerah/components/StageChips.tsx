import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, ScrollView, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import type { StageKey } from '../logic';

export type StageChoice = StageKey | 'unspecified';

/**
 * The period chips of the list view (frame SeerahList): the life stages that have events, then «غير محدد» on a dashed edge.
 * The row runs edge to edge and starts at the 16 pt inset; each chip is 36 pt (44 to touch), 14 pt text, and the selected
 * one is filled in brand. Selecting one scrolls the list to its section; the list keeps the selection in step as it scrolls,
 * and the row scrolls to keep the selected chip in view. The selected chip is a radio.
 */
export function StageChips({
  choices,
  selected,
  onSelect,
  testID = 'seerah-stage-chips',
}: {
  choices: readonly StageChoice[];
  selected: StageChoice | null;
  onSelect: (choice: StageChoice) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const scroller = useRef<ScrollViewInstance>(null);
  const boxes = useRef<Partial<Record<StageChoice, { x: number; width: number }>>>({});
  const viewport = useRef(0);
  const contentWidth = useRef(0);
  const placed = useRef(false);
  const maxX = () => Math.max(0, contentWidth.current - viewport.current);

  // Keep the selected chip in view, centred where the row allows.
  useEffect(() => {
    const box = selected === null ? undefined : boxes.current[selected];
    if (box !== undefined && viewport.current > 0) {
      scroller.current?.scrollTo({ animated: true, x: Math.min(maxX(), Math.max(0, box.x + box.width / 2 - viewport.current / 2)) });
    }
  }, [selected]);

  // An RTL row starts at its right end: iOS opens a horizontal scroll view at its left, which cut the first chip off.
  const onContentSizeChange = (width: number) => {
    contentWidth.current = width;
    if (!placed.current && viewport.current > 0) {
      placed.current = true;
      if (I18nManager.isRTL) {
        scroller.current?.scrollTo({ animated: false, x: maxX() });
      }
    }
  };

  const remember = (choice: StageChoice) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    boxes.current[choice] = { width, x };
  };

  return (
    <ScrollView
      accessibilityLabel={t('seerah.list.periods')}
      contentContainerStyle={{ gap: theme.space[2], paddingHorizontal: theme.space[4] }}
      horizontal
      onContentSizeChange={onContentSizeChange}
      onLayout={(event) => {
        viewport.current = event.nativeEvent.layout.width;
        if (contentWidth.current > 0) {
          onContentSizeChange(contentWidth.current);
        }
      }}
      ref={scroller}
      showsHorizontalScrollIndicator={false}
      testID={testID}
    >
      {choices.map((choice) => {
        const on = selected === choice;
        const dashed = choice === 'unspecified';
        const label = dashed ? t('seerah.age.bucket') : t(`seerah.stages.${choice}`);
        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            hitSlop={theme.space[1]}
            key={choice}
            onLayout={remember(choice)}
            onPress={() => onSelect(choice)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: on ? theme.colors.brandSurface : theme.colors.surfaceRaised,
              borderColor: on ? theme.colors.brandSurface : dashed ? colors.lineStrong : colors.line,
              borderRadius: (theme.size.touchTarget - 2 * theme.space[1]) / 2,
              borderStyle: dashed && !on ? 'dashed' : 'solid',
              borderWidth: dashed ? theme.stroke.focus : theme.stroke.hairline,
              justifyContent: 'center',
              minHeight: theme.size.touchTarget - 2 * theme.space[1],
              opacity: pressed ? theme.opacity.pressed : 1,
              paddingHorizontal: theme.size.chipPaddingX,
            })}
            testID={`${testID}-${choice}`}
          >
            <UiText
              style={[{ fontSize: 14, lineHeight: 20 }, on ? { color: theme.colors.onBrandSurface } : null]}
              variant="caption"
              weight={on ? 600 : 500}
            >
              {label}
            </UiText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
