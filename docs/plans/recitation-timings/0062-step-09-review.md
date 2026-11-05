# ADR 0062, step 9: review (simulator screenshots against the frames)

Branch `ft/recitation-timings`. Reviewer: the orchestrating agent (a stronger model), not the Haiku implementer. Read first: `CLAUDE.md` "Frontend rule", `apps/mobile/CLAUDE.md` "Components and screens (rule)". No code is written in this step except fixes the review finds, which go back to the step that owns them. Do not commit.

## Preconditions

Steps 1 to 8 are done and their gates are green. The Islam Sobhi pilot data (ADR 0061, B7) is installed on the simulator, or a local fixture reciter with no file for surah 37 (and 39, 40, 45, 65) exists in the dev `content.db`. Use only the placeholder names the app shows; do not copy the frames' Quran text into any note.

## Frames and what to compare

Render each frame at 390 x 844: `python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <scratchpad>/<id>.png`. Screenshot the iPhone 17 simulator: `xcrun simctl io booted screenshot <scratchpad>/<id>-sim.png`. Save everything in the scratchpad, never the repo.

| Frame id | Reach it by | Check |
| --- | --- | --- |
| `PlayerReciters` | open the full player, playing, on a surah the pilot reciter lacks | no artwork; title and tag; ayah card at its text height; progress; transport; utility row has exactly three columns (repeat, range, sleep) with no speed; list label «القرّاء»; four rows fit with no scroll: current with check and «يُتلى الآن», not downloaded with the 44 pt download button, installed, unavailable dimmed «غير متوفرة لهذه السورة» |
| `PlayerReciterDownloading` | tap download on a reciter | that row shows «جارٍ التنزيل», the 4 pt bar in player colours and the 44 pt stop button |
| `ReadingMiniUnavailable` | reader on a surah the reciter lacks, tap the mini play | info tile, message, «تغيير القارئ» pill (44 pt), no play button, no progress; the pill opens the Listen tab |
| `ReadingMiniSkipped` | play the surah before a missing one with continuous play (or drive `useSkipNoticeStore.show` from a dev hook) | the secondary gold-ink line under the subtitle on the Listen tab, gone after about 4 s |
| `ReciterSurahsUnavailable` | Listen > the pilot reciter | missing surahs dimmed with «غير متوفرة», not pressable; others unchanged |

Pass criterion (CLAUDE.md): identical to the frame unless the developer approved a difference. The approved differences recorded so far: step 3 (the reciter page keeps `DownloadRow` rows without the SurahIndex medallion); step 4 (collapse affordance, if the chevron is decorative only). Anything else is a mismatch and fails the review.

## Behaviour checks (iPhone 17 simulator, Arabic then English)

1. Speed: no speed button or menu in the Quran player; the Azkar player still has its speed control and works (Azkar was not touched).
2. Mini bar: unavailable state appears on play; picking another reciter in Listen returns the bar to idle; reading another surah does the same; collapse to the capsule and expand again.
3. Continuous play: with the notice, VoiceOver (or the accessibility inspector) announces it once; with Reduce Motion on, the line changes opacity only.
4. Last available surah ends: playback stops, no notice. Surah 114 ends: stops.
5. Player list: switch while playing keeps playing at the start of the current ayah; switch while paused stays paused and resume plays the new voice; repeat range carries and drops with «بدون تتبع»; download then auto-play; leave the player during a download: no switch on completion; stop button cancels.
6. Drag-to-dismiss still works from the header and from the top of the reciter list.
7. Large text size (accessibility sizes) and iPhone SE: the column scrolls instead of clipping, no overlap.
8. RTL and LTR: the check, the buttons, the progress fill and the status line mirror correctly; the play glyph never flips.
9. Expanded window (iPad simulator is deferred; check only that nothing branches on device model: `grep -rn "Platform.isPad" apps/mobile/src/features/audio` returns nothing new).

## Code review checklist

- Every new component has its own file and colocated test covering render, variants, interaction, RTL (ar and en), accessibility role and label, and no raw hex.
- Screens only compose. No hard-coded strings: every new string is in `ar.json` and `en.json` (list: step briefs 2, 3, 4, 5, 7).
- No `Platform.isPad`; tokens through `useTheme()`; motion through `src/core/theme/motion.ts`.
- `git diff --stat` touches nothing in `apps/api`, `packages/api-contract` or `features/azkar/**` except `AzkarPlayerBody.tsx` (one import line) and `azkar/audio/speed-rates.ts` (new).
- No contract change: `npm run generate -w @quran/api-contract` shows no diff (not required to run; no endpoint changed).
- `grep -rn "speed" apps/mobile/src/features/audio` has only `SPEED_ICON` left.

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Close-out

Record the review result and the screenshot paths in the plan index ("ADR 0062 steps" table in `docs/plans/recitation-timings.md`). Open questions Q1 to Q8 are answered by the developer before the branch is committed; update ADR 0062 or add a short ADR if an answer changes a decision. Update `quran-app-screens.html` only if the developer asks.
