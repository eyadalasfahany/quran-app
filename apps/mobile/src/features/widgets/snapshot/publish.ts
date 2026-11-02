import type { WidgetSnapshot, WidgetWriterId } from './types';

/**
 * A place the snapshot is written to, with the redraw that goes with it (ADR 0035 §4). One writer per target:
 * - `mmkv`: the app's canonical copy (MMKV `quran-prefs`). Always first; the sync compares against it and the Android
 *   headless task reads it.
 * - `android`: no store of its own. It only asks the placed Android widgets to redraw from `mmkv`.
 * - `ios-app-group` (prompt 16): writes `widgets/snapshot.json` into the App Group container, then reloads WidgetKit.
 * - `wear-os` (prompt 15): sends the same JSON through the Wear data layer, then requests a tile update.
 *
 * A writer gets the snapshot's JSON once, as a string, so every target stores the same bytes.
 */
export type WidgetSnapshotWriter = {
  readonly id: WidgetWriterId;
  /** Stores the JSON where this target's widgets read it. May throw; the other targets are still written. */
  write: (json: string) => Promise<void> | void;
  /** Asks this target's widgets to redraw. Optional: a target with no widget of its own has nothing to redraw. */
  refresh?: () => Promise<void> | void;
};

/**
 * Writes the snapshot to every writer in order, then asks each written target to redraw. The stores come first, so a
 * widget that redraws reads the new values. A failing writer is skipped for its redraw and does not stop the others;
 * a failed redraw is dropped (the next periodic update draws it, ADR 0035 §4).
 */
export async function publishWidgetSnapshot(
  snapshot: WidgetSnapshot,
  writers: readonly WidgetSnapshotWriter[],
): Promise<void> {
  const json = JSON.stringify(snapshot);
  const written: WidgetSnapshotWriter[] = [];
  for (const writer of writers) {
    try {
      await writer.write(json);
      written.push(writer);
    } catch {
      // This target keeps its last snapshot; the others are still written.
    }
  }
  for (const writer of written) {
    try {
      await writer.refresh?.();
    } catch {
      // The stored snapshot is the source of truth; a missed redraw is corrected by the next update.
    }
  }
}
