# Fix plan: iPad reader panel, iPad Prayer sidebar, English surah names

Date: 2 Nov 2026 · Status: steps 1–4 implemented on `main`, not committed (2 Nov 2026). Open: no ring on the two non-circular play controls (ReciterSurahRow pill, «تشغيل من هنا» tile) until a design exists · Branch: `main` (developer, 2 Nov 2026)

Found while capturing store screenshots on the iPad Pro 13" and iPhone 17 simulators (`docs/branding/app-store-assets/store-screenshots`). Three bugs, three independent steps, one Haiku brief each (delegation rule). Each step ships with its tests and passes `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`, plus the simulator visual check.

---

## Step 1: the overlay side panel has an invisible scrim

**Symptom.** iPad portrait (1032 pt, expanded class): opening an ayah's options or tafsir draws the 380 pt side panel over the reading column. The page stays at full strength behind it, so the panel looks like it cuts the ayah and tafsir text in half.

**Cause.** `AdaptiveReaderLayout` (`src/features/reader/components/AdaptiveReaderLayout.tsx`) has three placements (approved in Phase 2 step 6): `sheet` below 840 pt, `overlay` from 840 to 1,099 pt, `docked` from 1,100 pt. In `overlay` the tap-to-close `Pressable` (`reader-overlay-scrim`) has no background, so nothing marks the page as covered. The behaviour is approved; the missing scrim colour is the bug.

**Change (option 1A, recommended).**
- Give the overlay scrim `backgroundColor: theme.colors.scrim` (the token already exists: light `rgba(19,35,31,.40)`, sepia and dark variants) and fade it in and out with `timing('fast')` (`src/core/theme/motion.ts`; no fade with Reduce Motion on).
- In `overlay` only, the panel is a solid raised surface (`surfaceRaised`, no glass), so the scrim doesn't tint it, and it has a raised shadow.
- In `overlay` only, the panel starts below the reader toolbar row instead of at `topInset + 16`. Today the toolbar pill sits on top of the panel's header (seen on the iPad capture).
- No change to `PANEL_DOCK_MIN_WIDTH`, placements, routes or the sheet path.

**Option 1B (not recommended).** Dock the panel whenever the window is expanded and the remaining column is ≥ 560 pt (1032 − 396 = 636 on iPad portrait). It matches spec §4's "centered column beside a side panel" more literally, but it reverses the approved 1,100 threshold, so it needs an ADR and a new frame.

**Tests.** `AdaptiveReaderLayout.test.tsx`: overlay at widths 900 and 1,099 renders the scrim with the `scrim` colour; docked (1,100, 1,366) and sheet (375, 700) render no scrim; tapping the scrim calls `onCloseOverlay`; Reduce Motion renders it without animation; Arabic and English.

**Visual check.** iPad Pro 13" portrait, reader → ayah options and tafsir, compared with `#ReaderExpandedTafsir` / `#ReaderExpandedActions` for the panel itself. Frame: `#ReaderOverlayTafsir` in `quran-app-screens.html` (drawn 2 Nov 2026 from `#ReaderExpandedTafsir`), pending the developer's approval.

---

## Step 2: Prayer opened from the iPad sidebar loses the sidebar

**Symptom.** Expanded window: tapping «الصلاة» / Prayer in the sidebar opens prayer times full screen, with no sidebar. Settings and Search do the same. The other sidebar items keep it.

**Cause.** ADR 0032 gave the Prayer tab's place to Menu. Prayer moved to `/salah`, a root stack route outside `(main)` (`src/core/layout/destinations.ts`, comment on the `(salah)` entry). Only `(main)/_layout.tsx` wraps its screens in `MainShell`, which draws the sidebar, so `/salah` renders without it.

**Change (option 2A, recommended).**

> **Superseded by ADR 0051 (2 Nov 2026).** The sidebar is gone, so this change was removed when `main` was merged into `fix/issues`: there is no `app/salah/_layout.tsx` and no `active` prop on `MainShell`, and `/salah` is a pushed screen on every window. See the superseded amendment in ADR 0032.

- Add `app/salah/_layout.tsx`: when `useWindowClass() === 'expanded'`, render `<MainShell expanded active="(salah)">` around the salah `Stack`; otherwise render the `Stack` alone (phones keep today's pushed screen with a back button).
- `MainShell` gains an optional `active?: DestinationName` prop that wins over the segment lookup, because `/salah`'s segments name no group.
- Expanded only: open `/salah` from the sidebar with no push animation (add a `Stack.Screen name="salah"` entry to `app/_layout.tsx` with `animation: 'none'` while expanded), so the sidebar doesn't slide in on top of itself.
- Settings and Search stay pushed pages (they are not sidebar destinations). Say so in ADR 0032 as an amendment.

**Option 2B.** Register `(salah)` as a hidden tab inside `(main)` (a tab with no bar item). It's cleaner if `NativeTabs` renders a hidden trigger, but the current comment says native tabs render a tab-less route blank, so this needs a spike first and reopens ADR 0032.

**Tests.** `MainShell.test.tsx`: `active` overrides the segment match and marks the Prayer item selected. New `app/salah/_layout` test through the router test harness: expanded renders `sidebar-salah` selected; compact renders no sidebar. `__tests__/salah-route.test.tsx`: update the existing "opens the Salah screen from the expanded sidebar" test, which already fails on `main`.

**Visual check.** iPad Pro 13" portrait and landscape: Home → sidebar Prayer → Qibla → back, with the sidebar steady and Prayer selected, compared with `#ExpandedHome`.

---

## Step 3: English interface shows Arabic surah names

**Symptom.** In English: the Home "Continue reading" card says «Surah البقرة»; Khatma's start option says «Where I left off · البقرة · ayah 255»; search results say «Surah البقرة».

**Cause.** These pass `chapter.nameArabic` whatever the locale:
- `src/features/home/screens/HomeScreen.tsx:141` (`surahName={continueReading.chapter.nameArabic}`)
- `src/features/khatma/screens/KhatmaScreen.tsx:150` (`surah: content.lastReadChapter.nameArabic`)
- `src/features/search/components/SurahResultRow.tsx:23`

Recent listens and reciter downloads already choose by locale (`locale === 'ar' ? nameArabic : nameSimple`).

**Change (decided: transliteration everywhere in English).**
- Add `chapterDisplayName(chapter, locale)` to `src/features/reader/data/chapters.ts`: Arabic → `nameArabic`, English → `nameSimple` ("Al-Baqarah"). `nameEn` ("The Cow") stops being displayed; English search still matches it (`surahMatch.ts`, unchanged).
- Switch every display site to the helper:
  - Reader title and place: `ReaderScreen.tsx:77`, `:78`
  - Ayah and tafsir panel header: `AyahPanelContent.tsx:165`, `:208`
  - Player, lock screen and caption: `audio/player.ts:186`, `useVerseCaption.ts:25`, `usePlayerNames.ts:49`
  - Home: `HomeScreen.tsx:141`
  - Khatma: `KhatmaScreen.tsx:150`
  - Library: `ContinueReadingRow.tsx:27`
  - My Quran: `BookmarkListCard.tsx:50`, `HighlightListCard.tsx:66`, `NoteListCard.tsx:51`
  - Search: `SearchResultRow.tsx:34`, `SurahResultRow.tsx:23`
  - Menu: `useMenuPreviews.ts:76`
  - Already locale-aware, refactor to the helper: `recent-listen-items.ts:49`, `ReciterDownloadsScreen.tsx:165`
- Stay Arabic in both languages (part of the printed page or its ornament): `SurahHeader.tsx` cartouche, `HafsMushafPage.tsx:93`, `MushafPage.tsx:73`, `mushaf/page-slots.ts:32`.
- Check against the frame before changing: the surah index title (`SurahRow.tsx:34`, Amiri). If `#SurahIndex` in English shows the Arabic name with a Latin subtitle, keep it.

**Tests.** A new `src/features/reader/data/chapters.test.ts` for the helper; `ContinueReadingCard`/`HomeScreen`, `KhatmaStartOptions`/`KhatmaScreen` and `SurahResultRow` tests assert the English name in `en` and the Arabic name in `ar`.

**Visual check.** iPhone 17 in English: reader title, ayah panel, player and lock screen, Home, Khatma, My Quran lists, Search "baqarah" and "cow".

---

## Step 4: one current ayah, and play buttons show loading (developer rules, 2 Nov 2026)

Two rules from the developer, planned together because both change every play entry point.

### Rule A: one current ayah
**Rule.** The app has one current ayah: `reader.lastVerseKey`, read through `useLastReadVerseKey()` (`src/features/reader/anchor/useLastReadVerseKey.ts`).
- While audio plays, it is the ayah being recited. Playback writes it through `writePlayedPlace` (ADR 0028 §2), and scrolling doesn't move it.
- When nothing plays, it is the reading place (ADR 0037 §5).

The Home card, the Index row and Khatma's "Where I left off" already read it. Two things don't yet:

**A1. The mini player** (`MiniPlayer.tsx`, all three variants: `tabs`, `reader`, `sidebar`).
- *Today.* An idle player shows the reader's top ayah, in the `reader` variant only (`useIdleReciter`, `useVerseCaption(topVerseKey)`, `playIdle(topVerseKey)`). A paused player shows the last-played surah and ayah, and ▶ resumes it.
- *New.* Whenever the player isn't `playing` or `loading` (idle, paused, error), every variant shows the current ayah's surah and ayah with the reciter a play would use (`catalogueReciter()`). ▶ calls `playVerse(currentVerseKey)`, which starts at the beginning of that ayah, as the developer chose. While playing or loading, nothing changes: the bar shows what is playing.
- *Visibility.* `tabs` and `sidebar` show today only once something has loaded (`useMiniPlayerVisible`). They will also show while idle once a current ayah has been saved (`storage.contains(readerLastVerseKey)`) and a reciter resolves. That is the rule the `reader` variant already uses. A fresh install with nothing read shows no bar.
- *Cold start.* `restoreLastSession()` still restores the audio session as paused, so the full player keeps its surah and position. The bar shows the current ayah, per the rule.

**A2. The reciters list** (`ListenScreen` → `ReciterRow` → `playReciter`, in `reciter-playback.ts`).
- *Today.* ▶ plays the reciter from the start of the loaded surah, or surah 1 (`playChapter(chapterId ?? 1)`).
- *New.* ▶ plays that reciter from the current ayah:
  - pack not installed: install first, as today;
  - `setReciterId(resourceId)`;
  - `playFromVerse(currentVerseKey)`.
- *Unchanged.* If the same reciter is already playing, it keeps playing. If it is paused on the current ayah, it resumes.
- *Out of scope, keep as is.* A surah tapped on a reciter's page (`playSurahFromReciter`) still starts that surah. Home's "Recently listened" (`playRecentListen`) still resumes its own saved position. Say so in the ADR.

**Decided (developer, 2 Nov 2026).** The idle bar on tabs and sidebar is OK. ▶ always starts the current ayah from its beginning (`playVerse`), including when it is the paused ayah (the simpler path).

### Rule B: loading until audio starts, on the mini player and every play button
**Approved design.** «Loading states», approved 2026-10-30 in `quran-app-screens.html`: while the player is loading, the play/pause button shows the pause glyph with a thin ring that turns once per `duration-pulse`, and the mini bars draw the same ring at their size. Reduce Motion: the ring stays still and pulses (opacity 1 ↔ 0.55, like the skeletons). It was never built.

**Gap.** Status is `loading` only once the file loads. The pack install that `playVerse` and `playReciter` run first leaves the status `idle`/`paused` for seconds, with no feedback.

**Change.**
- *Store.* `playerStore` gets `startingTarget: PlayTarget | null`. `PlayTarget` is `{ kind: 'verse', verseKey } | { kind: 'reciter', resourceId } | { kind: 'surah', resourceId, chapterId } | { kind: 'listen', resourceId, chapterId }`.
  - Every play entry point sets it on tap, before any install: `playVerse`, `playReciter`, `playRecentListen`, `playSurahFromReciter`, the mini player's ▶, and the full player's ▶.
  - It clears when the status becomes `playing`, `paused` or `error`, or when the install fails.
- *Hook.* `useIsStarting(target)` is true while `startingTarget` matches that button's target, or while status is `loading` and the loaded item matches. The mini player and full player use "any target", so they show the ring for any start.
- *Component.* New design-system component `BufferingRing` (`src/shared/ui/BufferingRing.tsx` and its own test).
  - Draws a thin ring around its child at the button's size, stroke `theme.stroke.regular`, colour `accent`.
  - Turns with `duration.pulse` linear, repeating. Under Reduce Motion it pulses opacity with `pulseTiming()` instead.
  - Accessibility: `accessibilityState={{ busy: true }}`, label «جارٍ التحميل» / "Loading" (new i18n key `player.loading`).
- *Buttons that wrap their glyph in the ring and show pause while starting:*
  - the mini player (all variants);
  - the full player;
  - the reader ayah row ▶ (`ReadingAyahRow`) and the ayah panel's «تشغيل من هنا» (`AyahActionsPanel`);
  - the reciters list rows (`ReciterRow`);
  - the reciter page surah rows (`ReciterSurahRow`);
  - Home's "Recently listened" rows;
  - the onboarding reciter preview, if it plays audio.

  Each one shows the ring only for its own target.

**Tests.**
- `playerStore`: `startingTarget` set and cleared on playing, paused, error and failed install.
- `reciter-playback` / `play-verse`: target set before the install; `playReciter` plays from the current ayah; same-reciter cases unchanged.
- `useMiniPlayerVisible`: the idle `tabs`/`sidebar` rule.
- `MiniPlayer`: idle and paused show the current ayah; ▶ calls `playVerse(current)`; the ring shows while starting.
- `BufferingRing`: render, the Reduce Motion pulse, busy role and label, ar and en.
- Each listed button: ring while its own target starts, none for another target.

**Visual check.** iPhone 17 and iPad:
- Pause on 2:255, scroll to 2:260: the bar says Ayah 260.
- Tap a reciter in Listen: it starts at the current ayah, with the ring during the pack install.
- Compare the ring with the «Loading states» frame.

**ADR 0046** (new): one current ayah drives the mini player and the reciters list, amending ADR 0028; every play entry shows the approved buffering ring from tap to first audio.

---

## Decisions (developer, 2 Nov 2026)

1. Step 1: **1A**, dim the page under the overlay panel. The overlay state is drawn in `quran-app-screens.html` and approved before code.
2. Step 2: **2A**, expanded shell around `/salah`; amend ADR 0032.
3. Step 3: **transliteration everywhere** in English ("Al-Baqarah"), the reader title and player included; record it in a short ADR (it changes what the reader title shows).

## Also found (not in this plan)

- Reciter name "Mishari Rashid al-\`Afasy" has a stray backtick from QF's `reciter_name`. Fix in the API mirror or display layer; content rule check needed (names are not Quran text).
- Inline tafsir in the reader leaves a large empty gap inside the tafsir block before the "Source" line.
- Three tests already fail on `main` (`native-tabs-platform`, `salah-route`, `MenuScreen`); step 2 touches one of them.
