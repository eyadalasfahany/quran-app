import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip } from '@/shared/ui';

import type { SearchScope } from '../searchScope';

/** The search scope chips (Quran, Hadith, Azkar), shown only for the scopes that have content. Radio options, like BookmarkKindTabs. */
export function SearchScopeChips({
  value,
  onChange,
  scopes,
  testID = 'search-scope',
}: {
  value: SearchScope;
  onChange: (scope: SearchScope) => void;
  scopes: readonly SearchScope[];
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t('search.scope.label')}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      testID={testID}
    >
      {scopes.map((scope) => (
        <Chip
          key={scope}
          label={t(`search.scope.${scope}`)}
          onPress={() => onChange(scope)}
          role="radio"
          selected={value === scope}
          testID={`${testID}-${scope}`}
        />
      ))}
    </View>
  );
}
