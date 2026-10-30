import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { setHighlight, type UserStore } from '@/features/library/data';
import { EmptyState, highlightFill, IconButton, type HighlightColor } from '@/shared/ui';

import type { SavedHighlightItem } from '../data/saved-items';
import { HighlightFilterChips, type HighlightFilter } from './HighlightFilterChips';
import { SavedVerseRow } from './SavedVerseRow';

const HIGHLIGHT_ICON = { ios: 'highlighter', android: 'border_color' } as const;
const CLOSE_ICON = { ios: 'xmark', android: 'close' } as const;

/**
 * Every highlighted ayah (#MyQuran, التظليلات): the colour dot, the «سورة · الآية» title and the
 * colour name under it. Tapping opens the reader there; the trailing button removes the highlight.
 * With none, the tab draws the #EmptyMyQuran state.
 */
export function HighlightListCard({
  items,
  onOpenVerse,
  onOpenMushaf,
  store,
  testID = 'highlight-list',
}: {
  items: readonly SavedHighlightItem[];
  onOpenVerse: (verseKey: string) => void;
  onOpenMushaf: () => void;
  store?: UserStore;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [filter, setFilter] = useState<HighlightFilter>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        action={{ label: t('myQuran.empty.highlights.action'), onPress: onOpenMushaf }}
        body={t('myQuran.empty.highlights.body')}
        icon={HIGHLIGHT_ICON}
        testID={`${testID}-empty`}
        title={t('myQuran.empty.highlights.title')}
      />
    );
  }

  const visible = filter === null ? items : items.filter(({ row }) => row.color === filter);

  const remove = (verseId: number) => {
    try {
      setHighlight(verseId, null, store);
    } catch {
      // The live query restores the stored state.
    }
  };

  return (
    <>
      <HighlightFilterChips onChange={setFilter} value={filter} />
      {visible.map(({ row, verse, chapter }) => {
        const surah = chapter?.nameArabic ?? verse.verseKey;
        const title = t('myQuran.reference', { ayah: formatNumber(verse.verseNumber, locale), surah });

        return (
          <SavedVerseRow
            key={row.id}
            leading={<ColorDot color={row.color} />}
            onPress={() => onOpenVerse(verse.verseKey)}
            subtitle={t(`ui.highlight.${row.color}`)}
            testID={`${testID}-row-${row.id}`}
            title={title}
            trailing={
              <IconButton
                icon={CLOSE_ICON}
                iconSize={theme.size.iconSm}
                label={t('myQuran.removeHighlight')}
                onPress={() => remove(row.verseId)}
                testID={`${testID}-remove-${row.id}`}
                tone="muted"
              />
            }
          />
        );
      })}
    </>
  );
}

// The swatch is a display dot here; the tappable selector lives in the ayah panel (HighlightSwatch).
function ColorDot({ color }: { color: HighlightColor }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: highlightFill(theme.colors, color),
        borderRadius: theme.radius.pill,
        height: theme.size.icon,
        width: theme.size.icon,
      }}
    />
  );
}
