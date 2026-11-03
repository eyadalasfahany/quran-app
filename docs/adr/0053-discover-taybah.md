# 0053 — «اكتشف طيبة»: a checklist that teaches by doing, from one registry

Date: 2026-11-03 · Status: proposed (developer approved the design, 3 Nov 2026; frames are awaiting approval) · Relates to ADR 0010 (frames first), ADR 0012 (HIG), ADR 0034 (personal settings), ADR 0036 and ADR 0051 (layouts).

## Context

New people do not find the reader modes, Tafsir, follow-along, Azkar, Misbaha, goals, search or the widget. The developer approved a short checklist that teaches by doing: each row opens the real feature and ticks itself off when the person actually uses it. A future feature must be introduced the same way with one registry entry, not a new screen.

## Decision

1. **One registry in code.** `apps/mobile/src/features/discover/registry.ts` lists every entry, in display order:
   `{ id, since, group, titleKey, open, tipKey? }`.
   - `id` is a stable string (for example `reader.mushaf`). It is the only key stored.
   - `since` is the app version that introduced the entry (for example `1.1.0`). It records when a row arrived. It is not used for logic.
   - `group` is one of the five groups: القراءة, مصحفي, الاستماع, العبادات, التطبيق.
   - `titleKey` is an i18n key in `ar.json` and `en.json`.
   - `open` is either `{ kind: 'route', href }` (an Expo Router route, typed with `satisfies keyof paths` where it is an API route) or `{ kind: 'widget-sheet' }`.
   - `tipKey` is optional. It names a one-time tip shown when the row opens the feature.
   The initial registry has 13 entries: القراءة 4, مصحفي 1, الاستماع 1, العبادات 4, التطبيق 3 (the widget row is optional).

2. **Ticks are recorded where the real action happens.** `markDiscovered(id)` is called from the UI call site of each feature action, never from a store setter that also runs during onboarding, background installs or watch and widget merges. Re-marking an id that is already done is a no-op. The Misbaha tap calls it only when the id is not done yet, so the common path does no JSON work.

3. **Stored state (MMKV, `storageKeys.discover`).** Local only and cleared with the other personal data.
   - `done`: JSON array of ids the person has completed.
   - `acknowledged`: JSON array of ids the person has seen as a set. It is written only when the person finishes the set («تم» on the done state) or hides the card («إخفاء»). It holds every id in the registry at that moment.
   - `hidden`: boolean, set by «إخفاء», cleared when the card is shown again.
   - `pendingTip` and `tipsSeen`, described in §5.

4. **Card visibility, deterministic.** Let `pending` be the entries not in `done`, and `hasUnacknowledged` be true when some registry id is not in `acknowledged`.
   - When `pending` is not empty, the card shows unless it is `hidden` and nothing is unacknowledged. So a hidden card returns when an update adds an entry.
   - When `pending` is empty, the card shows the «أحسنت» state while `hasUnacknowledged` is true. «تم» writes `acknowledged` and the card goes away on the next render. No timer.

5. **«جديد» badge.** A row is badged only when `acknowledged` exists and the row's id is not in it. A person who never finished or hid the card sees no badges. A person who did sees badges only on rows added after that point. This matches the brief: only new rows are marked after an update adds features.

6. **One-time tips.** A row opened from the screen sets `pendingTip` to its `tipKey`. The target screen shows that tip once, when `pendingTip` matches its key and the key is not in `tipsSeen`. «حسنًا» adds the key to `tipsSeen` and clears `pendingTip`. Tips fade instead of sliding under Reduce Motion, and they are read by VoiceOver and TalkBack.

7. **Layout.** The card sits on Home below the greeting and above the date pill. The full screen is a single scroll view with five groups. Layout reads `useWindowClass()`, never device checks. Motion uses `src/core/theme/motion.ts`. No new colours or tokens: the frames use the existing light tokens.

8. **Frames first.** The frames `DiscoverCard`, `DiscoverCardNew`, `DiscoverCardDone`, `DiscoverScreen`, `DiscoverTip` and `DiscoverWidgetSheet` are in `quran-app-screens.html`, in one row before `WidgetsHelp`. The widget sheet reuses the copy of `WidgetsHelp`.

## Consequences

- Adding a feature later means one registry entry, the `markDiscovered` call in that feature, and its strings. People who finished the set see the card again with only the new rows badged.
- Existing users see the card after this update. All 13 rows are not done for them, and nothing is badged until they finish or hide it.
- Watch and widget merges never tick a row, so the checklist reflects what the person did on the phone.
- The «أضف الودجت» row is optional and ticks when the person reads the widget sheet.
- The follow-along row ticks only with a reciter that has word timings. Otherwise its action opens the Listen tab to pick one.
- The `ui-ux-pro-max` skill is not installed on the build machine, so only the Apple HIG skill was applied. Recheck the frames against that skill when it is available.
- iPhone 17 simulator and Android emulator screenshots of the running card are needed before the developer's approval; they are not in this change.

## Amended 3 Nov 2026: a guided tour, step by step

The developer asked for the list to lead the person through the features one after another, with a tip on each screen, instead of rows that only open a screen. This replaces the one-time tips (§6) and how a row opens its feature.

1. **Tour.** Tapping a row (on the Home card or the Discover screen) starts the tour at that step. `DiscoverTourNavigator` (mounted once at the root) opens the step's screen: at once when the tour starts, and `TOUR_ADVANCE_DELAY_MS` (900 ms) after a step completes or is skipped, so the person sees the action register. The current step is the MMKV key `discover.tourStep`. A tour left over from an earlier launch is ended at start.
2. **Steps.** Each registry entry has `step`: `action` (the feature's real action completes it: play, a count, a search, a goal) or `show` (the tip explains the screen and «التالي» completes it: the three reading modes, My Mushaf, prayer times, Settings, the widget). Prayer times is a show step so a person who already set a location is not stuck; setting one still completes it.
3. **The tip.** `DiscoverTipCard` shows only while the tour is on its step: «الخطوة ٣ من ١٣», ✕ (ends the tour where it is), the step's line (`discover.tour.*`), «تخطي» (marks the step done as seen, then the next step; developer, 3 Nov 2026) and, on a show step, «التالي». It sits on the screen where the action is; the listening tip points down at the reciters' play buttons. Light text buttons (`DiscoverTipTextButton`, `DiscoverTipCloseButton`) replace the design system's ghost button and icon button on the brand surface, where those would not read.
4. **Order.** The tour moves forward in list order and skips steps already done. A skipped step counts as done. Each step's screen replaces the previous step's: the screens opened for earlier steps are closed first, so back leaves the tour. After the last step the person returns to the Discover list; ✕ leaves them where they are.
5. **Reading steps.** «عرض المصحف», «عرض القراءة» and «عرض التركيز» open the Quran screen in that mode, with that mode's own tip. «التفسير» opens the Quran screen with a tip to tap an ayah and choose التفسير; opening tafsir completes it.
6. **Listening.** The step opens the Listen tab; pressing play on a reciter completes it.
7. **Frame.** `#DiscoverTip` now draws the tour card (step count, ✕, «تخطي», «التالي», pointer) with 16/20 pt padding.
