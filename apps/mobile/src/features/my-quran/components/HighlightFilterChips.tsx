import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip, highlightColors, type HighlightColor } from '@/shared/ui';

/** No chip selected: the highlights list shows every colour. */
export type HighlightFilter = HighlightColor | null;

/**
 * The colour filters over the highlights list (step brief): «الكل» plus one chip per colour.
 * The group behaves as radio options — picking a colour filters the list to it.
 */
export function HighlightFilterChips({
  value,
  onChange,
  testID = 'highlight-filter',
}: {
  value: HighlightFilter;
  onChange: (filter: HighlightFilter) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t('myQuran.filter.label')}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      testID={testID}
    >
      <Chip
        label={t('myQuran.filter.all')}
        onPress={() => onChange(null)}
        role="radio"
        selected={value === null}
        testID={`${testID}-all`}
      />
      {highlightColors.map((color) => (
        <Chip
          key={color}
          label={t(`myQuran.filter.${color}`)}
          onPress={() => onChange(color)}
          role="radio"
          selected={value === color}
          testID={`${testID}-${color}`}
        />
      ))}
    </View>
  );
}
