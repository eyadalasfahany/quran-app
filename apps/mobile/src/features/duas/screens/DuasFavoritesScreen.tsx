import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen } from '@/shared/ui';
import { AzkarItemCard } from '@/features/azkar/components/AzkarItemCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';

import { toggleDuaFavorite } from '../data/favorites-repository';
import { useDuaFavoriteCards } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark.fill', android: 'bookmark' } as const;
const EMPTY_ICON = { ios: 'bookmark', android: 'bookmark' } as const;

/**
 * Saved duas (screens/, favourites). Each card opens its dua; the bookmark removes it. A Quranic card shows
 * its surah and verses, never the verse text. An empty list says how to add one and offers the browse screen.
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
                      onPress={() => {
                        toggleDuaFavorite(card.duaKey);
                      }}
                      pressed
                      testID={`dua-favorite-remove-${index + 1}`}
                      variant="raised"
                    />
                  }
                  key={card.duaKey}
                  number={index + 1}
                  onPress={() =>
                    router.push(card.kind === 'quran' ? duasHref.quranDetail(card.duaKey) : duasHref.hadithDetail(card.duaKey))
                  }
                  preview={card.preview}
                  quranReference={card.quranReference}
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
