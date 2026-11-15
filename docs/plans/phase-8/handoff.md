# Phase 8 (Seerah) — overnight hand-off, 15 Nov 2026

Branch `claude/focused-hamilton-18qhkz`. Nothing is released: no OTA, no deploy, no store build. All Seerah data is **draft**: no record is signed, and production import refuses anything that is not signed (`seerah:import --release`).

## What is built

| Part | Where | State |
| --- | --- | --- |
| Plan, ADR, content-plan entry | `docs/plans/phase-8.md`, `phase-8/data-format.md`, `docs/adr/0089-…` (Proposed), `docs/content-plan.md` | Written; spec edits listed in `phase-8/spec-changes.md`, not applied |
| Book source | `apps/api/database/data/seerah/source/` | «نور اليقين» Shamela0023692 via OpenITI, pinned (ref, SHA-256). JK009247 was rejected: it is corrupt (plan, «Edition decided») |
| Canonical text | `seerah:canonicalize` → `book/structure.json` | 258 sections (2 front), 1,087 paragraphs; only a closed list of OpenITI markup is removed; canonical SHA-256 pinned |
| Data, whole book | `gazetteer.json`, `events/E1–E4.json`, `exclusions.json`, `milestones.json`, `map/layout.*.json` | 211 events, 63 exclusions with reasons, 81 places with book quotes and coordinates, 5 milestones on the age axis, 12 journeys (الهجرة، الشام ×2، الحبشة ×2، الطائف، بدر، خيبر، الفتح، حنين، غزوة الطائف، تبوك) linked to their events. Every quote is a verbatim substring of the book. 43 events in «أخرى», 18 in «غير محدد» |
| Validator, tools, report | `seerah:validate` (V1–V19), `seerah:fmt`, `seerah:find`, `seerah:quote`, `seerah:skeleton`, `seerah:place-candidates`, `seerah:report`, `seerah:approve` | Green in `--structure --complete`; CI runs fmt + validate |
| API | 12 `seerah_*` tables, `seerah:import`, pack group `seerah` (~243 KB), `GET /api/v1/seerah/books` | Tests green; contract regenerated |
| Design | `screens/frames/seerah/` (27 frames), `design-assets/seerah/` (region, Makkah, Madinah maps, light and dark) | Captions «(بانتظار الموافقة)»; review links below |
| App | `apps/mobile/src/features/seerah/`, `app/seerah/` | Logic, 40+ components, screens, data layer, Menu card, Sources rows. Lint, tsc and the full Jest suite green |

## See it on the simulator

```bash
cd apps/api
php artisan migrate
php artisan seerah:import --structure --build-packs   # draft data, local only
php artisan serve                                     # http://localhost:8000
# apps/mobile/.env: EXPO_PUBLIC_API_URL=http://localhost:8000
cd ../mobile && npx expo start                        # iPhone 17 simulator
```

Open the Menu → «السيرة النبوية» → download the book (on-demand, like a hadith collection) → the map opens.

Seerah itself adds no native package, but the Expo patch updates below (`6330ba7`) change the native fingerprint, so **the next release is a store build**, not an EAS Update.

## Review the content

```bash
cd apps/api && php artisan seerah:report
open storage/app/seerah-report/index.html
```

The report opens with «أخرى» and «غير محدد», then every event by year with its place and the book quote highlighted inside the paragraph, then the place tree. When a batch is right: `php artisan seerah:approve E1` (and E2, E3, E4, then G for the gazetteer, M for milestones). Production import needs every group signed.

## Review the design

`design/seerah/<Screen>/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` for SeerahMapRegion, SeerahMapRegionYear, SeerahMapMakkah, SeerahMapMadinah, SeerahCluster, SeerahClusterSheet, SeerahEvent, SeerahEventOther, SeerahList, SeerahMapKey, SeerahTimeline, SeerahState*, SeerahExpanded, SeerahExpandedCity, SeerahMenu, SeerahSources.

## Decisions waiting for you

1. **Content:** the 43 «أخرى» events and 18 «غير محدد» years (the report lists them first). Also the judgement calls the drafting agents noted per event (`note` fields), for example the Isra pinned to بيت المقدس, حرب الفجار at نخلة, the Mu'ta letter.
2. **Coordinates:** set by hand from standard geography (Wikidata was not reachable). Places with uncertain locations carry `approximate_location`.
3. **Life-stage bands:** الطفولة ٠–١١، الصبا ١٢–١٩، الشباب ٢٠–٣٩، الكهولة ٤٠–٦٣ (proposed by the coordinator; change in the app's `logic/age.ts` and the frames).
4. **Licence:** OpenITI CC BY-NC-SA 4.0 accepted with credit; the Shamela upstream question stays open (RB21).
5. **Release wiring:** the `start-web.sh` line is written in the plan (step 26), not added.
6. **ADR 0089** is Proposed; the spec §5/§7 edits are listed, not applied.

## Not done, or not verified here

- **No visual check of the running app.** The app has no web target and this machine has no iOS simulator, so the built screens were only checked by Jest render tests. The frame-vs-app comparison on the iPhone 17 simulator is still to do.
- Fan-out ring for clusters and a pin-anchored callout are not built: a pin with several events opens the spot sheet, and the single-event callout sits above the timeline.
- No entry point on the expanded layout besides the Menu card (the app has no sidebar).
- The map-performance spike (step 27) was not measured on a device.
- `PackBuilderTest` («leaves the previous pack…») fails only when tests run as root (this sandbox); it passes in CI.

## Review

An independent code review of the mobile feature found no crash path; its nine findings (show-on-map opening the list, the map not panning to the place, a one-event city not opening, the spot-sheet push, retry with no catalogue entry, the mini-map drawing the whole art, live route strokes, back to the Menu tab, unused art copies) are fixed with regression tests (`72cbdca`). Two of them should still be tried on the simulator: open an event from a crowded spot's sheet, and tap the age chip on an event page.

## CI

- API and Contract workflows: green on this branch.
- Mobile workflow: `expo-doctor` failed on «18 packages out of date» (Expo's newer SDK 58 patches). At your request (`6330ba7`), `npx expo install --fix` moved expo and 17 expo-* packages to the expected patches; the postinstall patches still apply. The npm audit gate then failed on new `@xmldom/xmldom` advisories (≤0.8.14) through `@bacons/xcode` → `@expo/plist@0.0.18` (0.7.13): an `overrides` entry pins 0.8.15 there. Lint, tsc and all 9,086 Jest tests pass locally.

## CI fixed on the way (also broken on main)

- `StartupConfigTest` counted `hadith:import` inside `hadith:import-explanations`.
- `composer audit` failed on a new Laravel advisory: `laravel/framework` 13.38 → 13.42.
- The Contract workflow had no database, and Scramble now reads the schema: it now runs MySQL and migrates first.
- developer, 15 Nov 2026: smaller edge chips; a tap centres and zooms on the item (ADR 0089 amendment).
