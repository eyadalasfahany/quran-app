import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { SeerahEvent, SeerahParagraph } from '../types';

import { EventPage } from './EventPage';
import { EventPager } from './EventPager';
import { EventTopBar } from './EventTopBar';

/**
 * One event page as a screen, a sheet or the expanded window's side panel (frames SeerahEvent, SeerahExpanded): the top
 * bar, the book's text with its chips and notes, and the floating previous and next bar in book order. It holds no data of
 * its own; the screen passes what it read and what each control does.
 */
export function SeerahEventView({
  event,
  previous,
  next,
  index,
  total,
  paragraphs,
  sourcePage,
  placeName,
  alsoPlaces,
  miniMap,
  onBack,
  onShowList,
  onPrevious,
  onNext,
  onShowAge,
  onShowPlace,
  onAlsoPlacePress,
  testID = 'seerah-event-view',
}: {
  event: SeerahEvent;
  previous: SeerahEvent | null;
  next: SeerahEvent | null;
  index: number;
  total: number;
  paragraphs: readonly SeerahParagraph[];
  sourcePage: number | null;
  placeName: string;
  alsoPlaces: readonly { id: string; name: string }[];
  miniMap?: ReactNode;
  onBack: () => void;
  onShowList: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShowAge: () => void;
  onShowPlace: () => void;
  onAlsoPlacePress: (placeId: string) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.surface, flex: 1 }} testID={testID}>
      <View style={{ paddingHorizontal: theme.space[4], paddingTop: theme.space[2] }}>
        <EventTopBar crumb={placeName} onBack={onBack} onShowList={onShowList} />
      </View>
      <EventPage
        alsoPlaces={alsoPlaces}
        event={event}
        miniMap={miniMap}
        onAlsoPlacePress={onAlsoPlacePress}
        onShowAge={onShowAge}
        onShowPlace={onShowPlace}
        paragraphs={paragraphs}
        placeName={placeName}
        sourcePage={sourcePage}
      />
      <View
        pointerEvents="box-none"
        style={{ bottom: theme.space[4], left: theme.space[4], position: 'absolute', right: theme.space[4] }}
      >
        <EventPager
          index={index}
          next={next === null ? null : { id: next.id, title: next.titleAr }}
          onNext={onNext}
          onPrevious={onPrevious}
          previous={previous === null ? null : { id: previous.id, title: previous.titleAr }}
          total={total}
        />
      </View>
    </View>
  );
}
