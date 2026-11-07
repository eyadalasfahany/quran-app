import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Chip } from '@/shared/ui';

import { collectionTitle } from '../titles';
import type { HadithCollection } from '../types';

type ScopeCollection = Pick<HadithCollection, 'slug' | 'number' | 'titleAr' | 'titleEn'>;

/**
 * The search scope: «الكل» first, then one chip per installed collection in the fixed collection order. A wrapping row
 * of radio chips (frame HadithCollSearch). `scope` null means every installed collection.
 */
export function HadithScopeChips({
  collections,
  scope,
  onChange,
  testID = 'hadith-scope-chips',
}: {
  collections: readonly ScopeCollection[];
  scope: string | null;
  onChange: (scope: string | null) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const ordered = [...collections].sort((a, b) => a.number - b.number);

  return (
    <View
      accessibilityLabel={t('hadith.search.scopeLabel')}
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      testID={testID}
    >
      <Chip
        label={t('hadith.search.scopeAll')}
        layout="sheet"
        onPress={() => onChange(null)}
        role="radio"
        selected={scope === null}
        testID={`${testID}-all`}
      />
      {ordered.map((collection) => (
        <Chip
          key={collection.slug}
          label={collectionTitle(collection, locale, t)}
          layout="sheet"
          onPress={() => onChange(collection.slug)}
          role="radio"
          selected={scope === collection.slug}
          testID={`${testID}-${collection.slug}`}
        />
      ))}
    </View>
  );
}
