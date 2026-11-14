import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip, UiText, useContrastColors } from '@/shared/ui';

import type { StageKey } from '../logic';

export type StageChoice = StageKey | 'unspecified';

/**
 * The period chips of the list view (frame SeerahList): the life stages that have events, then «غير محدد» on a dashed edge.
 * Selecting one scrolls the list to its section; the selected chip is a radio. They scroll sideways when they do not fit.
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

  return (
    <ScrollView
      accessibilityLabel={t('seerah.list.periods')}
      contentContainerStyle={{ gap: theme.space[2], paddingHorizontal: theme.space[4] }}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
    >
      {choices.map((choice) =>
        choice === 'unspecified' ? (
          <Pressable
            accessibilityLabel={t('seerah.age.bucket')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === choice }}
            key={choice}
            onPress={() => onSelect(choice)}
            style={{
              alignItems: 'center',
              backgroundColor: selected === choice ? theme.colors.brandSurface : theme.colors.surfaceRaised,
              borderColor: selected === choice ? theme.colors.brandSurface : colors.line,
              borderRadius: theme.radius.chipPanel,
              borderStyle: 'dashed',
              borderWidth: theme.stroke.focus,
              justifyContent: 'center',
              minHeight: theme.size.touchTarget,
              paddingHorizontal: theme.size.chipPaddingX,
            }}
            testID={`${testID}-${choice}`}
          >
            <UiText style={selected === choice ? { color: theme.colors.onBrandSurface } : null} variant="caption" weight={600}>
              {t('seerah.age.bucket')}
            </UiText>
          </Pressable>
        ) : (
          <Chip
            key={choice}
            label={t(`seerah.stages.${choice}`)}
            onPress={() => onSelect(choice)}
            role="radio"
            selected={selected === choice}
            testID={`${testID}-${choice}`}
          />
        ),
      )}
    </ScrollView>
  );
}
