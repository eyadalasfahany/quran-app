import { useMemo } from 'react';

import { useTheme } from '@/core/theme';
import { seerahArtFor } from '../art/seerah-art';
import { EventMiniMap } from '../components/EventMiniMap';
import { SeerahEventView } from '../components/SeerahEventView';
import { useSeerahEvent, useSeerahWorld } from '../hooks';
import { mapTargetForPlace } from '../logic';
import { OTHER_PLACE_ID } from '../types';

/**
 * Reads one event and shows its page. The route, the medium window's sheet and the expanded window's side panel all render
 * this, and differ only in what back, previous, next and «show on the map» do. An unknown id renders nothing; the route
 * decides what to show for it.
 */
export function SeerahEventPane({
  eventId,
  onBack,
  onNavigate,
  onShowList,
  onShowAge,
  onShowPlace,
  testID,
}: {
  eventId: string;
  onBack: () => void;
  onNavigate: (id: string) => void;
  onShowList: () => void;
  onShowAge: (age: number) => void;
  onShowPlace: (placeId: string) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const world = useSeerahWorld();
  const data = useSeerahEvent(eventId);

  const names = useMemo(() => new Map(world.places.map((place) => [place.id, place.nameAr])), [world.places]);
  const name = (id: string) => names.get(id) ?? '';

  const miniMap = useMemo(() => {
    const event = data?.event;
    if (event === undefined || event.placeId === OTHER_PLACE_ID) {
      return null;
    }
    const target = mapTargetForPlace(world.levels, world.places, event.placeId);
    const level = target === null ? undefined : world.levels.find((item) => item.id === target.levelId);
    const position = level?.positions.find((item) => item.placeId === target?.pinPlaceId);
    const art = level === undefined ? null : seerahArtFor(level.id, theme.name);
    if (level === undefined || position === undefined || art === null) {
      return null;
    }
    const path = event.routeId === null ? undefined : level.routePaths.find((item) => item.routeId === event.routeId);
    return (
      <EventMiniMap
        art={art}
        onPress={() => onShowPlace(event.placeId)}
        placeName={name(event.placeId)}
        point={{ x: position.x, y: position.y }}
        route={path === undefined ? null : { d: path.d, kind: path.kind }}
        viewbox={level.viewbox}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event, world.levels, world.places, theme.name, names]);

  if (data === undefined) {
    return null;
  }
  const { event } = data;

  return (
    <SeerahEventView
      alsoPlaces={event.alsoPlaceIds.map((id) => ({ id, name: name(id) }))}
      event={event}
      index={data.index}
      miniMap={miniMap}
      next={data.next}
      onAlsoPlacePress={onShowPlace}
      onBack={onBack}
      onNext={() => data.next !== null && onNavigate(data.next.id)}
      onPrevious={() => data.previous !== null && onNavigate(data.previous.id)}
      onShowAge={() => event.ageFrom !== null && onShowAge(event.ageFrom)}
      onShowList={onShowList}
      onShowPlace={() => onShowPlace(event.placeId)}
      paragraphs={data.text.paragraphs}
      placeName={name(event.placeId)}
      previous={data.previous}
      sourcePage={data.text.sourcePage}
      testID={testID}
      total={data.total}
    />
  );
}
