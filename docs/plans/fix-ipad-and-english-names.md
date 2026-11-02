# Fix plan: iPad reader panel, iPad Prayer sidebar, English surah names

Date: 2 Nov 2026 · Status: decided (developer, 2 Nov 2026): 1A, 2A, 3A-everywhere · Branch: `fix/ipad-and-english-names` (off `main`)

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

## Step 4: one current ayah, and the mini player follows it (developer rule, 2 Nov 2026)

**Rule.** The app has one current ayah, `reader.lastVerseKey`. While audio plays, it is the ayah being recited, and scrolling doesn't move it (ADR 0028 §2, ADR 0037 §5). When nothing plays, it is the reading place. Everything that shows or resumes a place reads it: the Home card, the Index row, Khatma's "Where I left off", the reader's return, and now the **mini player**.

**Change from today.** When idle, the mini player shows the last-played item. Under the rule, an idle mini player shows the current ayah with the default reciter, and ▶ starts from that ayah. Example: pause on 2:255, read on to 2:260, and the mini player shows "Al-Baqarah · Ayah 260" and recites from 2:260.

**Reciters list (developer, 2 Nov 2026).** ▶ on any reciter in the reciters list plays that reciter from the current ayah, not from the start of a surah. Choosing a specific surah on a reciter's page still starts that surah; confirm this when the step is planned.

**Before briefing.**
- Trace how the mini player gets its item (`usePlayerNames`, `playerStore`, `MiniPlayer`), and the reciters list play action (`(listen)` tab, `reciter/[id]`).
- Define what an idle mini player does when the current ayah's reciter pack isn't installed.
- Write an ADR that amends ADR 0028 and records the rule.

This touches audio and the reader, so it is planned in detail as its own step after steps 1–3.

---

## Decisions (developer, 2 Nov 2026)

1. Step 1: **1A**, dim the page under the overlay panel. The overlay state is drawn in `quran-app-screens.html` and approved before code.
2. Step 2: **2A**, expanded shell around `/salah`; amend ADR 0032.
3. Step 3: **transliteration everywhere** in English ("Al-Baqarah"), the reader title and player included; record it in a short ADR (it changes what the reader title shows).

## Also found (not in this plan)

- Reciter name "Mishari Rashid al-\`Afasy" has a stray backtick from QF's `reciter_name`. Fix in the API mirror or display layer; content rule check needed (names are not Quran text).
- Inline tafsir in the reader leaves a large empty gap inside the tafsir block before the "Source" line.
- Three tests already fail on `main` (`native-tabs-platform`, `salah-route`, `MenuScreen`); step 2 touches one of them.
