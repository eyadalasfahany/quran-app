import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Button, EmptyState, Screen, UiText } from '@/shared/ui';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';

import { MyDuaRow } from '../components/MyDuaRow';
import { useMyDuas } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

const EMPTY_ICON = { ios: 'square.and.pencil', android: 'edit' } as const;

/** «أدعيتي» list (screens/, #MyDuas and #MyDuasEmpty). */
export function MyDuasScreen({ testID = 'screen-my-duas' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const duas = useMyDuas();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.space[4]}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader onBack={() => goBackOr(duasHref.home)} title={t('duas.mine.title')} />
          {duas.length === 0 ? (
            <EmptyState
              action={{ label: t('duas.mine.add'), onPress: () => router.push(duasHref.mineEdit()) }}
              body={t('duas.mine.emptyBody')}
              icon={EMPTY_ICON}
              testID="my-duas-empty"
              title={t('duas.mine.emptyTitle')}
            />
          ) : (
            <>
              <UiText testID="my-duas-intro" tone="muted" variant="caption">
                {t('duas.mine.intro')}
              </UiText>
              <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[4] }}>
                {duas.map((dua, index) => (
                  <MyDuaRow
                    dua={dua}
                    index={index}
                    key={dua.id}
                    onBellPress={() => router.push(duasHref.mineEdit(dua.id, { reminder: true }))}
                    testID={`my-dua-row-${index + 1}`}
                  />
                ))}
              </ScrollView>
              {/* Clears the home indicator; the bottom space is the token nearest the frame's 28 pt margin. */}
              <View style={{ paddingBottom: insets.bottom + theme.space[6] }} testID="my-duas-footer">
                <Button
                  label={t('duas.mine.add')}
                  onPress={() => router.push(duasHref.mineEdit())}
                  stretch
                  testID="my-duas-add"
                  variant="primary"
                />
              </View>
            </>
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}
