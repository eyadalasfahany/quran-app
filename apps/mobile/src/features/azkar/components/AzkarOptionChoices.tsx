import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { AzkarOptionChoiceRow } from './AzkarOptionChoiceRow';

export type AzkarOptionChoice = { value: string; label: string };

/**
 * The choices of one option, drawn inside the sheet under the options bar (SheetHost has no overlay for a pop-up menu,
 * so the choices take the card's own space). Choosing one applies it and closes the list (the reader does that).
 */
export function AzkarOptionChoices({
  title,
  choices,
  selected,
  onSelect,
  testID = 'azkar-option-choices',
}: {
  title: string;
  choices: readonly AzkarOptionChoice[];
  selected: string;
  onSelect: (value: string) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      <View style={{ paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] }}>
        <UiText accessibilityRole="header" tone="muted" variant="label" weight={500}>
          {title}
        </UiText>
      </View>
      {choices.map((choice) => (
        <AzkarOptionChoiceRow
          checked={choice.value === selected}
          key={choice.value}
          label={choice.label}
          onPress={() => onSelect(choice.value)}
          testID={`${testID}-${choice.value}`}
        />
      ))}
    </View>
  );
}
