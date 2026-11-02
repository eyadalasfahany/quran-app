import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, Screen } from '@/shared/ui';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';

import { duasHref, goBackOr } from '../routes';

const EMPTY_ICON = { ios: 'bookmark', android: 'bookmark' } as const;

/** Duas favourites (mirrors Azkar favourites; content arrives in a later task). */
export function DuasFavoritesScreen({ testID = 'screen-duas-favorites' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader onBack={() => goBackOr(duasHref.home)} title={t('duas.favorites.title')} />
          <EmptyState
            action={{ label: t('duas.favorites.browse'), onPress: () => goBackOr(duasHref.home) }}
            body={t('duas.favorites.emptyBody')}
            icon={EMPTY_ICON}
            testID="duas-favorites-empty"
            title={t('duas.favorites.emptyTitle')}
          />
        </View>
      </ContentColumn>
    </Screen>
  );
}
