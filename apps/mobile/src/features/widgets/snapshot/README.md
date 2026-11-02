# Widget snapshot

The one small JSON that every home-screen widget reads, and that the Apple Watch (prompt 16) and Wear OS (prompt 15)
read too (ADR 0035 §4). The app builds it from local data only, in the app's own runtime. Nothing in this module calls
the network, and nothing here holds Quran text, dhikr text, a coordinate or a secret.

## Files

| File | Role |
| --- | --- |
| `types.ts` | The schema (version 1), the label keys and the writer ids. The source of truth. |
| `build-snapshot.ts` | Pure assembly of a snapshot from already-read values. |
| `gather.ts` | Reads the local sources (goals, reading place, Khatma, Azkar progress, misbaha, location) and calls the builder. |
| `prayer-entries.ts` | The prayer instants for today and the next two days, from the same `timesFor` the app uses. |
| `labels.ts` | Resolves every label from the `widgets` key group in `ar.json` / `en.json`. |
| `select.ts` | Parses the stored JSON, prayer state at a time (`next`, `noLocation`, `stale`). |
| `patch.ts` | Replaces only the misbaha block (a widget «+» does not rebuild the rest). |
| `sync.ts` | Debounced, serialised rebuild with a skip when nothing changed. |
| `publish.ts` | Writes the JSON to each writer, then asks each target to redraw. |
| `store.ts` | The MMKV copy (`storageKeys.widgets.snapshot`), and the `mmkv` writer. |
| `deep-links.ts` | The allowlist of routes a widget may open, and the URL builder. |
| `__fixtures__/*.json` | Golden snapshots for the Swift and Kotlin decoders. Jest checks them against the builder. |

The Android renderers live beside it in `../android/`, the platform writers list in `../writers.ts`.

## Schema, version 1

Top-level keys (widgets ignore any key they do not know):

```json
{
  "schemaVersion": 1,
  "writtenAt": 1793558400000,
  "locale": "ar",
  "labels": { "nextPrayer": "…", "openApp": "…" },
  "prayer": {
    "place": "…",
    "entries": [{ "key": "fajr", "at": 1793580000000 }],
    "validUntil": 1793731200000
  },
  "progress": { "percent": 60, "rows": [{ "key": "wird", "label": "…", "value": "…", "done": false }] },
  "reading": { "verseKey": "2:255", "surah": "…", "ayah": 255, "page": 42 },
  "wird": { "done": 4, "target": 10 },
  "misbaha": { "count": 33, "target": 100, "todayTotal": 150 },
  "azkar": null
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | `1` | Another value means the open-the-app state. A reader never guesses. |
| `writtenAt` | number (ms) | When the snapshot was built. Ignored when comparing content. |
| `locale` | `"ar"` or `"en"` | The app language. Direction follows it, not the device. |
| `labels` | object | Every label the widgets draw, one key per entry of `WIDGET_LABEL_KEYS`, already in `locale`. |
| `prayer.place` | string or null | A display name. Coordinates are never written. |
| `prayer.entries` | array | `{ key, at }` in time order, `key` one of `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` (sunrise is never written). Empty without a location. |
| `prayer.validUntil` | number or null | The last entry's instant. Past it, every surface shows the stale state and no time. |
| `progress.percent` | integer 0 to 100 | The ring: the mean of the goals the user chose. |
| `progress.rows` | array | One row per chosen goal: `key`, `label`, `value` (already formatted), `done`. |
| `reading` | object or null | Where the reader stopped: the verse key, the surah's name, the ayah number and the page. Never the ayah's text. |
| `wird` | object or null | `{ done, target }` for an active Khatma plan; null without one. |
| `misbaha.count` | integer | The counter's own count. |
| `misbaha.target` | integer or null | The target, or null for "no limit". |
| `misbaha.todayTotal` | integer | Taps counted today, from every counting surface. |
| `azkar` | object or null | `{ sessions: [{ id, title, done, total, complete }] }` once Azkar content is installed; null otherwise. Titles are session display names, never dhikr text. |

The label keys are: `nextPrayer`, `noLocation`, `openApp`, `stale`, `progressTitle`, `progressEmpty`,
`continueReading`, `resume`, `ayahLabel`, `pageLabel`, `wirdTitle`, `wirdUnit`, `of`, `misbaha`, `misbahaNoTarget`,
`countAction`, `azkarTitle`, `azkarEmpty`, `complete`, `prayerFajr`, `prayerDhuhr`, `prayerAsr`, `prayerMaghrib`,
`prayerIsha`. The source is `WIDGET_LABEL_KEYS` in `types.ts`; a test keeps `labels.ts` in step with it.

Numerals inside `value` strings are produced by the app (Arabic-Indic in Arabic). A native target never formats numbers
for display; it draws the strings it was given.

### Rules a reader and a writer both keep

- **No Quran or dhikr text.** A surface shows a surah name, an ayah number, a page, a session name, a count or a time.
- **No coordinates.** `prayer` carries instants and a place name only.
- **Stale is shown as stale.** A reader that has no valid `entries` entry after `now` shows the stale state. It never
  shows a time it did not receive.
- **Unknown fields are ignored.** Adding a field is not a breaking change. Changing or removing one is: it bumps
  `schemaVersion`, and the golden fixtures change with it.
- **The snapshot is the only input.** A native widget never recomputes prayer times, the progress or the labels.

### Golden fixtures

`__fixtures__/full.json` (every block filled) and `__fixtures__/no-location-no-plan.json` (no prayer entries, no wird,
no reading) are the contract for the decoders. `fixtures.test.ts` checks that each one parses, and that the builder
writes exactly those bytes for the same input. The XCTest decoder (prompt 16) and the Wear OS decoder (prompt 15) read
the same two files.

## Writers

`publish.ts` defines a writer per target:

```ts
type WidgetSnapshotWriter = {
  readonly id: 'mmkv' | 'android' | 'ios-app-group' | 'wear-os';
  write: (json: string) => Promise<void> | void; // stores the JSON where this target reads it
  refresh?: () => Promise<void> | void;          // asks this target's widgets to redraw
};
```

`publishWidgetSnapshot(snapshot, writers)` serialises the snapshot once and gives the same string to every writer, in
order. It writes each one, then calls `refresh` on each writer that stored its copy. A writer that throws does not stop
the others, and it gets no redraw. A failing redraw is dropped: the next periodic update draws the widget.

| Writer | Platform | Writes | Redraws |
| --- | --- | --- | --- |
| `mmkv` (`store.ts`) | all | MMKV `quran-prefs`, key `widgets.snapshot` | none |
| `android` (`android/writer.ts`) | Android | nothing (reads `mmkv`) | `requestAndroidWidgetUpdates()` |
| `ios-app-group` (prompt 16) | iOS | `widgets/snapshot.json` in the App Group `group.<bundle id>` | `WidgetCenter.reloadAllTimelines()` |
| `wear-os` (prompt 15) | Android (Wear) | the same JSON through the Wear data layer | a Tile update |

`writers.ts` lists the writers per platform. The `mmkv` writer always comes first: the sync compares against it and the
Android headless task reads it. To add a target, write one `WidgetSnapshotWriter` and add it to `activeWidgetWriters`,
then add its id to `WIDGET_WRITER_IDS` in `types.ts`.

The iOS and Wear OS writers receive the same `json` string. They must not parse and re-encode it, so every target
stores identical bytes and the golden fixtures stay the contract.

## Sync triggers and deep links

`sync.ts` rebuilds after a 1.5 s debounce and skips the write when the content (not `writtenAt`) is unchanged. A
misbaha tap never triggers a rebuild on its own: the Android «+» patches the stored misbaha block with `patch.ts`.

`deep-links.ts` allows `/salah`, `/sibha`, `/daily-goals`, `/khatma`, `/azkar`, `/read/<verseKey>` and
`/azkar/read/<categoryId>`, in the variant's scheme (`taybah://` or `taybah-dev://`). Each path has a route file in
`app/`; `deep-link-routes.test.ts` checks that every widget's tap opens one of them.

## Tests

| Test | Covers |
| --- | --- |
| `build-snapshot.test.ts`, `fixtures.test.ts` | The builder, the golden fixtures and the schema. |
| `select.test.ts`, `prayer-entries.test.ts` | Parsing, the prayer state, the timeline. |
| `labels.test.ts` | Every key of `WIDGET_LABEL_KEYS` is resolved. |
| `publish.test.ts`, `../writers.test.ts` | The writer contract: one JSON, the store before the redraw, failure isolation. |
| `sync.test.ts`, `patch` (through the task handler) | Debounce, skip-unchanged, the misbaha patch. |
| `no-religious-text.test.ts` | The snapshot holds only ids, counts, times, labels and the reading place; no renderer reads verse text. |
| `deep-link-routes.test.ts`, `deep-links.test.ts` | The allowlist and each tap target. |
