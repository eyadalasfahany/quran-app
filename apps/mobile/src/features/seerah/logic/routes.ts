import type { SeerahEvent, SeerahFocus, SeerahRoute } from '../types';
import { eventMatchesFocus } from './focus';

/** Routes with none of their events in the focus: the map dims them. With no focus nothing is dimmed. */
export function dimmedRouteIds(
  routes: readonly SeerahRoute[],
  events: readonly SeerahEvent[],
  focus: SeerahFocus,
): string[] {
  if (focus === null) {
    return [];
  }
  const byId = new Map(events.map((event) => [event.id, event]));
  return routes
    .filter((route) => !route.eventIds.some((id) => {
      const event = byId.get(id);
      return event !== undefined && eventMatchesFocus(event, focus);
    }))
    .map((route) => route.id);
}
