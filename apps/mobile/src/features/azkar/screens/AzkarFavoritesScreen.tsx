import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen } from '@/shared/ui';

import { AzkarItemCard } from '../components/AzkarItemCard';
import { AzkarScreenHeader } from '../components/AzkarScreenHeader';
import { useFavoriteCards } from '../data';
import { toggleFavorite } from '../data/favorites-repository';
import { azkarHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark.fill', android: 'bookmark' } as const;
const EMPTY_ICON = { ios: 'bookmark', android: 'bookmark' } as const;

/**
 * Saved dhikr (quran-app-screens.html, #AzkarFavorites and #AzkarFavoritesEmpty). Each card opens its entry; the
 * bookmark removes it. An empty list says how to add one and offers the browse screen.
 */
export function AzkarFavoritesScreen({ testID = 'screen-azkar-favorites' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const cards = useFavoriteCards();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader onBack={() => goBackOr(azkarHref.home)} title={t('azkar.browse.favourites')} />
          {cards.length === 0 ? (
            <EmptyState
              action={{ label: t('azkar.favourites.browse'), onPress: () => goBackOr(azkarHref.home) }}
              body={t('azkar.favourites.emptyBody')}
              icon={EMPTY_ICON}
              testID="azkar-favorites-empty"
              title={t('azkar.favourites.emptyTitle')}
            />
          ) : (
            <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
              {cards.map((card, index) => (
                <AzkarItemCard
                  action={
                    <IconButton
                      icon={BOOKMARK}
                      label={t('azkar.reader.favouriteRemove')}
                      onPress={() => toggleFavorite(card.entryKey)}
                      pressed
                      testID={`azkar-favorite-remove-${index + 1}`}
                      variant="raised"
                    />
                  }
                  key={card.entryKey}
                  number={index + 1}
                  onPress={() => router.push(azkarHref.entry(card.entryKey))}
                  preview={card.preview}
                  requiredCount={null}
                  testID={`azkar-favorite-${index + 1}`}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}

