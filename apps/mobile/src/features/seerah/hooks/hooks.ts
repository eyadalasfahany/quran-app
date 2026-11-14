import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { useContentDb } from "@/core/db/content/open";

import type { SeerahView } from "../components/ListToggle";
import {
  getSeerahBook,
  getSeerahCatalogEntry,
  getSeerahEvent,
  getSeerahEventNeighbours,
  getSeerahEventText,
  hasSeerahContent,
  listSeerahEvents,
  listSeerahMapLevels,
  listSeerahMilestones,
  listSeerahPlaces,
  listSeerahRoutes,
  type SeerahBook,
  type SeerahCatalogEntry,
  type SeerahEventText,
} from "../data";
import type {
  SeerahEvent,
  SeerahMapLevel,
  SeerahMilestone,
  SeerahPlace,
  SeerahRoute,
} from "../types";
import {
  initialSeerahView,
  readSeerahView,
  writeSeerahView,
} from "../view-pref";
import { useSeerahContent } from "./useSeerahContent";

export type SeerahWorld = {
  places: SeerahPlace[];
  events: SeerahEvent[];
  levels: SeerahMapLevel[];
  routes: SeerahRoute[];
  milestones: SeerahMilestone[];
};

const EMPTY_WORLD: SeerahWorld = {
  places: [],
  events: [],
  levels: [],
  routes: [],
  milestones: [],
};

export type SeerahEventData = {
  event: SeerahEvent;
  previous: SeerahEvent | null;
  next: SeerahEvent | null;
  index: number;
  total: number;
  text: SeerahEventText;
};

export function useSeerahAvailable(): boolean {
  return useSeerahContent(false, hasSeerahContent, []);
}

export function useSeerahBook(): SeerahBook | undefined {
  return useSeerahContent<SeerahBook | undefined>(undefined, getSeerahBook, []);
}

/** The pack as the synced catalogue lists it (size, install state), for the download state. */
export function useSeerahCatalogEntry(): SeerahCatalogEntry | undefined {
  return useSeerahContent<SeerahCatalogEntry | undefined>(
    undefined,
    getSeerahCatalogEntry,
    [],
  );
}

/** The whole map: the book has a few hundred events and about eighty places, so one read serves every screen. */
export function useSeerahWorld(): SeerahWorld {
  return useSeerahContent(
    EMPTY_WORLD,
    (db) => ({
      places: listSeerahPlaces(db),
      events: listSeerahEvents(db),
      levels: listSeerahMapLevels(db),
      routes: listSeerahRoutes(db),
      milestones: listSeerahMilestones(db),
    }),
    [],
  );
}

/** One event with its neighbours in book order and the book's text; undefined for an unknown id. */
export function useSeerahEvent(id: string): SeerahEventData | undefined {
  return useSeerahContent<SeerahEventData | undefined>(
    undefined,
    (db) => {
      const event = getSeerahEvent(db, id);
      const around = getSeerahEventNeighbours(db, id);
      if (event === undefined || around === undefined) {
        return undefined;
      }
      return { event, ...around, text: getSeerahEventText(db, id) };
    },
    [id],
  );
}

/** True once content.db is open: the screen shows nothing before it. */
export function useSeerahReady(): boolean {
  return useContentDb().ready;
}

/**
 * The map or list view. The route parameter wins, then the reader's remembered choice, then the list is suggested when a
 * screen reader is on. Toggling remembers the choice. The suggestion is never forced.
 */
export function useSeerahViewChoice(
  param: SeerahView | null,
): [SeerahView, () => void, (view: SeerahView) => void] {
  const stored = readSeerahView();
  const [view, setView] = useState<SeerahView>(() =>
    initialSeerahView({ param, stored, screenReader: false }),
  );

  useEffect(() => {
    if (param !== null || stored !== null) {
      return;
    }
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (active && on) {
        setView("list");
      }
    });
    return () => {
      active = false;
    };
    // The suggestion is read once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (next: SeerahView) => {
    writeSeerahView(next);
    setView(next);
  };

  return [view, () => choose(view === "map" ? "list" : "map"), choose];
}
