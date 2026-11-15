import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen } from '@/shared/ui';
import { AzkarItemCard } from '@/features/azkar/components/AzkarItemCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { toggleAzkarFavorite } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';

import { favoriteCategoryName } from '../data/category-labels';
import { toggleDuaFavorite } from '../data/favorites-repository';
import type { DuaFavoriteListCard } from '../data/favorite-cards';
import { useDuaFavoriteCards } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark.fill', android: 'bookmark' } as const;
const EMPTY_ICON = { ios: 'bookmark', android: 'bookmark' } as const;

/**
 * Saved duas (screens/, #DuasFavorites). Each row is the Azkar favourites row (#AzkarFavorites): the gold ring, the
 * text, a muted category line, and the bookmark that removes it. A Quranic row shows its verse text in the Quran face
 * (never truncated) and its reference. A Hisn dua (saved from Azkar) opens its Azkar entry, and its bookmark removes the
 * Azkar favourite. An empty list says how to add one and offers the browse screen.
 */
export function DuasFavoritesScreen({ testID = 'screen-duas-favorites' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const cards = useDuaFavoriteCards();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader onBack={() => goBackOr(duasHref.home)} title={t('duas.favorites.title')} />
          {cards.length === 0 ? (
            <EmptyState
              action={{ label: t('duas.favorites.browse'), onPress: () => goBackOr(duasHref.home) }}
              body={t('duas.favorites.emptyBody')}
              icon={EMPTY_ICON}
              testID="duas-favorites-empty"
              title={t('duas.favorites.emptyTitle')}
            />
          ) : (
            <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
              {cards.map((card, index) => (
                <AzkarItemCard
                  action={
                    <IconButton
                      icon={BOOKMARK}
                      label={t('azkar.reader.favouriteRemove')}
                      onPress={() => removeCard(card)}
                      pressed
                      testID={`dua-favorite-remove-${index + 1}`}
                      variant="raised"
                    />
                  }
                  badge="ring"
                  category={favoriteCategoryName(card.category, t)}
                  key={cardKey(card)}
                  number={index + 1}
                  onPress={() => router.push(openRoute(card))}
                  preview={card.preview}
                  quranReference={card.quranReference}
                  quranText={card.kind === 'quran' ? card.text : null}
                  requiredCount={null}
                  testID={`dua-favorite-${index + 1}`}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}

function cardKey(card: DuaFavoriteListCard): string {
  return card.kind === 'hisn' ? `hisn:${card.entryKey}` : card.duaKey;
}

/** A Hisn card opens its Azkar entry; a Duas card opens its own detail. */
function openRoute(card: DuaFavoriteListCard) {
  if (card.kind === 'hisn') {
    return azkarHref.entry(card.entryKey);
  }
  return card.kind === 'quran' ? duasHref.quranDetail(card.duaKey) : duasHref.hadithDetail(card.duaKey);
}

/** Removes the favourite: a Hisn dua is an Azkar favourite, so the Azkar store removes it. */
function removeCard(card: DuaFavoriteListCard) {
  if (card.kind === 'hisn') {
    toggleAzkarFavorite(card.entryKey);
    return;
  }
  toggleDuaFavorite(card.duaKey);
}
