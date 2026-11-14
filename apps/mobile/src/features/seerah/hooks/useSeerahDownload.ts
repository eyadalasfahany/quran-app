import { useCallback } from "react";

import { useOnline } from "@/core/network/useOnline";
import { useHadithDownloads } from "@/features/hadith/downloads";

import type { SeerahCatalogEntry } from "../data";

export type SeerahDownloadView =
  | { kind: "download" }
  | { kind: "downloading"; progress: number }
  | { kind: "offline" }
  | { kind: "error" };

/**
 * The install of the Seerah pack, through the same store the hadith downloads use (one install per resource, progress that
 * survives a remount, Wi-Fi only respected). Without the catalogue entry there is nothing to install: offline says why.
 */
export function useSeerahDownload(entry: SeerahCatalogEntry | undefined): {
  view: SeerahDownloadView;
  start: () => void;
  cancel: () => void;
} {
  const online = useOnline();
  const byId = useHadithDownloads((state) => state.byId);
  const begin = useHadithDownloads((state) => state.start);
  const stop = useHadithDownloads((state) => state.cancel);
  const resourceId = entry?.resourceId;
  const running = resourceId === undefined ? undefined : byId[resourceId];

  const start = useCallback(() => {
    if (resourceId !== undefined) {
      void begin(resourceId);
    }
  }, [begin, resourceId]);
  const cancel = useCallback(() => {
    if (resourceId !== undefined) {
      stop(resourceId);
    }
  }, [stop, resourceId]);

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
  } else {
    view = !online ? { kind: "offline" } : { kind: "download" };
  }
  return { view, start, cancel };
}
