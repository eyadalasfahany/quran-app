import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';

import { OTHER_PLACE_ID, type SeerahEvent, type SeerahParagraph } from '../types';

import { AlsoPlaces } from './AlsoPlaces';
import { EventHeader } from './EventHeader';
import { EventNote } from './EventNote';
import { EventText } from './EventText';
import { SourceLine } from './SourceLine';

/**
 * The scrolling body of an event page: the mini map slot, the heading with its chips, the notes about what the book does not
 * state, the book's text, the other places and the source line. The top bar and the previous/next bar are the screen's
 * (on the expanded window the page is the side panel). `bottomInset` keeps the last line clear of the floating pager.
 */
export function EventPage({
  event,
  placeName,
  alsoPlaces,
  paragraphs,
  sourcePage,
  miniMap,
  bottomInset = 140,
  onShowAge,
  onShowPlace,
  onAlsoPlacePress,
  testID = 'seerah-event-page',
}: {
  event: SeerahEvent;
  placeName: string;
  alsoPlaces: readonly { id: string; name: string }[];
  paragraphs: readonly SeerahParagraph[];
  sourcePage: number | null;
  /** An EventMiniMap, for an event with a drawn place. */
  miniMap?: ReactNode;
  bottomInset?: number;
  onShowAge: () => void;
  onShowPlace: () => void;
  onAlsoPlacePress: (placeId: string) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const placeMissing = event.placeId === OTHER_PLACE_ID;
  const yearMissing = event.ageFrom === null;
  const uncertain = event.certainty === 'approximate' || event.certainty === 'developer_assigned';

  return (
    // In the medium window's sheet the page scrolls with the sheet's drag; elsewhere this is a plain scroll view.
    <SheetScrollView
      contentContainerStyle={{ gap: theme.space[4], paddingBottom: bottomInset, paddingHorizontal: theme.space[4] }}
      testID={testID}
    >
      {miniMap}
      <EventHeader
        age={event.ageFrom}
        onAgePress={onShowAge}
        onPlacePress={onShowPlace}
        placeIsOther={placeMissing}
        placeName={placeName}
        title={event.titleAr}
      />
      {placeMissing ? <EventNote kind="place" /> : null}
      {yearMissing ? <EventNote kind="year" /> : null}
      {uncertain && !placeMissing && !yearMissing ? <EventNote kind="uncertain" /> : null}
      <EventText paragraphs={paragraphs} />
      <View style={{ gap: theme.space[3] }}>
        <AlsoPlaces onPress={onAlsoPlacePress} places={alsoPlaces} />
        <SourceLine page={sourcePage} />
      </View>
    </SheetScrollView>
  );
}
