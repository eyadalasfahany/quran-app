import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { NameActions } from '../components/NameActions';
import { NameHero } from '../components/NameHero';
import { NamePager } from '../components/NamePager';
import { NameReferenceRow } from '../components/NameReferenceRow';
import { NameSourceBlock } from '../components/NameSourceBlock';
import { NamesScreenHeader } from '../components/NamesScreenHeader';
import { NamesUnavailableState } from '../components/NamesUnavailableState';
import { toggleNameFavourite } from '../data/favorites-repository';
import { useNameDetail, useNamesAvailable } from '../data/hooks';
import { buildNameShareText } from '../data/share-text';
import { neighbourSlugs } from '../data/content-repository';
import { namesHref, goBackOr } from '../routes';
import { openContentDb } from '@/core/db/content/open';

export function NameDetailScreen({ slug, testID = 'screen-name-detail' }: { slug: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const available = useNamesAvailable();
  const detail = useNameDetail(slug);

  if (!available) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <NamesUnavailableState />
        </ContentColumn>
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <NamesScreenHeader onBack={() => goBackOr(namesHref.home)} title={t('names.list.title')} />
        </ContentColumn>
      </Screen>
    );
  }

  const { executor } = openContentDb();
  const neighbours = neighbourSlugs(executor, detail.position);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8], paddingTop: theme.space[2] }}>
          <NamesScreenHeader onBack={() => goBackOr(namesHref.home)} title={t('names.list.title')} />
          <NameHero nameAr={detail.nameAr} position={detail.position} />
          <NameActions
            isFavourite={detail.isFavourite}
            onFavouritePress={() => toggleNameFavourite(detail.nameSlug)}
            onSharePress={() => void Share.share({ message: buildNameShareText(detail) })}
          />
          {detail.references.length > 0 ? (
            <View style={{ gap: theme.space[3] }}>
              <NameSourceBlock note={detail.sourceNote} sourceLabel={detail.list.sourceLabelAr} />
              {detail.references.map((reference) => (
                <NameReferenceRow
                  key={reference.verseKey}
                  onPress={() => router.push(`/read/${reference.verseKey}` as Href)}
                  reference={reference}
                />
              ))}
            </View>
          ) : (
            <NameSourceBlock note={detail.sourceNote} sourceLabel={detail.list.sourceLabelAr} />
          )}
          <NamePager
            hasNext={neighbours.next !== null}
            hasPrevious={neighbours.previous !== null}
            onNext={() => neighbours.next && router.replace(namesHref.detail(neighbours.next))}
            onPrevious={() => neighbours.previous && router.replace(namesHref.detail(neighbours.previous))}
          />
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
