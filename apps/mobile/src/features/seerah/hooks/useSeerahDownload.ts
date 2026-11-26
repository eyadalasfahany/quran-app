import { useCallback } from "react";

import { useOnline } from "@/core/network/useOnline";
import { runDeviceContentSync } from "@/core/sync";
import { useHadithDownloads } from "@/features/hadith/downloads";

import type { SeerahCatalogEntry } from "../data";

export type SeerahDownloadView =
  | { kind: "downloading"; progress: number }
  | { kind: "offline" }
  | { kind: "error" };

/**
 * The install of the Seerah pack, through the same store the hadith downloads use (one install per resource, progress that
 * survives a remount), over any network (ADR 0097). The pack downloads with no tap, so a listed pack that is not installed
 * and has nothing running reads as downloading at 0: the screen's auto-install starts in the same commit. There is no
 * cancel. Without the catalogue entry there is nothing to install: offline says why, and the retry re-syncs the catalogue.
 */
export function useSeerahDownload(entry: SeerahCatalogEntry | undefined): {
  view: SeerahDownloadView;
  start: () => void;
} {
  const online = useOnline();
  const byId = useHadithDownloads((state) => state.byId);
  const begin = useHadithDownloads((state) => state.start);
  const resourceId = entry?.resourceId;
  const running = resourceId === undefined ? undefined : byId[resourceId];

  // Without a catalogue entry there is nothing to install: the action re-syncs the catalogue (as the hadith screen does)
  // and the entry arrives with it.
  const start = useCallback(() => {
    if (resourceId !== undefined) {
      void begin(resourceId, { anyNetwork: true });
    } else {
      void runDeviceContentSync();
    }
  }, [begin, resourceId]);

  let view: SeerahDownloadView;
  if (running?.status === "downloading" || running?.status === "waiting") {
    view = { kind: "downloading", progress: running.progress };
  } else if (running?.status === "failed") {
    view =
      running.reason === "network" || !online
        ? { kind: "offline" }
        : { kind: "error" };
  } else if (entry === undefined) {
    view = online ? { kind: "error" } : { kind: "offline" };
  } else if (!online) {
    view = { kind: "offline" };
  } else {
    // Installed with nothing to show is a broken pack (the error card's retry downloads it again); otherwise it is starting.
    view = entry.installed ? { kind: "error" } : { kind: "downloading", progress: 0 };
  }
  return { view, start };
}
