import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, Screen } from '@/shared/ui';

import { useSeerahEvent, useSeerahReady } from '../hooks';
import { goBackOr, seerahHref } from '../routes';
import { SeerahEventPane } from './SeerahEventPane';

/**
 * The event page route (frame SeerahEvent): compact windows push it full-screen from the map; the same page is the sheet on a
 * medium window and the side panel on an expanded one (SeerahScreen). Previous and next replace this route, so back goes
 * to the map, not through every event read.
 */
export function SeerahEventScreen({ eventId, testID = 'screen-seerah-event' }: { eventId: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ready = useSeerahReady();
  const data = useSeerahEvent(eventId);

  if (!ready) {
    return <Screen testID={testID} />;
  }
  if (data === undefined) {
    return (
      <Screen testID={testID}>
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: theme.space[4] }}>
          <EmptyState
            action={{ label: t('seerah.event.back'), onPress: () => goBackOr(seerahHref.home) }}
            body={t('seerah.event.notFoundBody')}
            title={t('seerah.event.notFoundTitle')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID={testID}>
      <SeerahEventPane
        eventId={eventId}
        onBack={() => goBackOr(seerahHref.home)}
        onNavigate={(id) => router.replace(seerahHref.event(id))}
        onShowAge={(age) => router.navigate(seerahHref.map({ age }))}
        onShowList={() => router.navigate(seerahHref.list)}
        onShowPlace={(placeId) => router.navigate(seerahHref.map({ place: placeId }))}
      />
    </Screen>
  );
}
