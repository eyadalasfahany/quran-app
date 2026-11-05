# 0062 — Unavailable surahs for a reciter, and the reciters list in the player

Date: 2026-11-04 · Status: **accepted** (developer, 4 Nov 2026) · Branch: `ft/recitation-timings` · Supersedes the `Player` and `PlayerBuffering` frames for the full player once implemented (the speed control is removed from both) · Rests on ADR 0061 (partial MP3Quran recordings: a missing surah is shown as unavailable in the list and skipped in continuous play)

## Context

ADR 0061 ships reciters whose recordings can lack surahs. Islam Sobhi lists 109 of 114 surahs, so 37 الصافات, 39 الزمر, 40 غافر, 45 الجاثية and 65 الطلاق have no audio for him. Until now the design had no frame for that: the mini player would start a surah that cannot play, the reciter's surah list had no state for a missing surah, and the full player had no way to switch reciter or to fetch a reciter whose pack is not on the device yet.

The full player also had a speed control («السرعة ١×»). The developer decided to remove playback speed from the app entirely.

## Decisions (accepted 4 Nov 2026)

1. **Mini player, surah unavailable for the selected reciter.** When the user presses play on a surah the reciter lacks (surah 37 with إسلام صبحي), the reader's mini bar shows an info glyph and «الصافات غير متوفرة بصوت إسلام صبحي», with a «تغيير القارئ» button (44 pt minimum) that opens the reciter picker. Nothing plays, and the bar has no play or progress state. Frame: `ReadingMiniUnavailable`.
2. **Continuous play skips the surah and says so.** Continuous play that reaches a surah the reciter lacks moves on (36 → 38). The playing mini player shows surah «ص» normally, plus a brief secondary line «تخطّي الصافات · غير متوفرة بصوت إسلام صبحي». The notice is shown wherever the playing mini bar shows (ADR 0059). It is transient: it shows for about 4 s, then the line disappears. VoiceOver announces it (`role="status"`, polite). Frame: `ReadingMiniSkipped`.
3. **Reciter's surah list marks unavailable surahs.** In Listen › the reciter's surah list, a surah the reciter lacks is dimmed (ink-muted), shows «غير متوفرة» where the play or download control would be, and is not tappable (no link, `aria-disabled`). Other rows are unchanged. Frame: `ReciterSurahsUnavailable`.
4. **Speed removed from the app entirely.** The speed feature is deleted: its UI, its store state, its persisted setting and its i18n strings. It is not moved to Settings. The utility row under the transport controls keeps repeat, the ayah range and the sleep timer, in three equal columns. Frame: `PlayerReciters`.
5. **Full player has no artwork; the reciters list is always visible.** `PlayerReciters` and `PlayerReciterDownloading` are non-scrolled layouts with no artwork: header, reciter name and surah, ayah card, progress, transport controls, the utility bar, then the «القرّاء» list, which is always visible. All four reciter rows fit 390 × 844. Below the controls the list shows the reciters for the current surah:
   - the current reciter is marked with a checkmark;
   - an installed reciter's row switches to that reciter when tapped;
   - a reciter whose pack is not downloaded shows a 44 pt download button;
   - a reciter who lacks the current surah shows «غير متوفرة لهذه السورة» and is disabled.

   Tapping download shows the row's progress (the 4 pt bar and 44 pt stop button from the tafsir download row). When the download finishes, the player switches to that reciter and auto-plays from the current ayah. Frames: `PlayerReciters` and `PlayerReciterDownloading`.
6. **Switching reciter keeps the place.** When the user picks another reciter in the «القرّاء» list, or a reciter download finishes and auto-plays, playback starts in the same surah at the start of the current ayah (the one current ayah, ADR 0046), using the new reciter's ayah timings. Play or pause state carries over: if it was playing, it keeps playing. Repeat and ayah-range settings carry over. **Fallback:** if the new reciter has no usable timings for that surah («بدون تتبع», ADR 0052), playback starts from the beginning of the surah. A reciter who lacks the surah stays disabled (decision 5).
7. **One selected reciter, app-wide (developer, 4 Nov 2026).** There is one selected reciter, the persisted `settings.ts` choice (`setReciterId`).
   - **Selecting.** On the Listen screen, both tapping a reciter's row (which opens his surah page) and pressing his ▶ make him the selected reciter.
   - **Who is shown and used.** The mini player shows the selected reciter whenever nothing is playing (idle or paused). Every play action (reader ayah ▶, mini play, Listen ▶, reciter page, recent listens, the player's list) uses the selected reciter.
   - **(a) Selecting while another reciter plays.** If another reciter is playing when a new one is selected by tapping his row, playback switches at the same place exactly as in decision 6: the start of the current ayah, same surah, and it keeps playing. With no usable timings for the surah it starts from the surah's beginning. If the new reciter lacks the surah, the unavailable state of decision 1 is shown and nothing plays. Selecting the reciter who is already playing does nothing.
   - **(b) Playing while nothing plays.** Pressing ▶ on a reciter (Listen row ▶, reciter page, the player's list, mini play) plays the selected reciter from the app's one current ayah (ADR 0046: the ayah the user selected or last read in the reader), never from the beginning of the surah. The exceptions are a reciter with no usable timings for that surah (then the surah's beginning) and a reciter who lacks the surah (then the unavailable state). Every entry point reads the same current-ayah source.
   - **(c) Tapping a row while nothing plays.** It only selects the reciter. The mini player shows him, ready to play from the current ayah, and nothing starts.
   - **One truth.** When nothing plays, the selected reciter is the settings choice. While audio plays, it is the playing reciter, and a switch (a) makes the two agree. A paused track by a different reciter than the selected one is moved to the selected reciter at the same ayah (as in decision 6) when it resumes.
   - **Decided answers (developer, 4 Nov 2026).** The reciter page's surah ▶ starts at the current ayah when that ayah is in that surah, else at the surah's beginning. A recent listen resumes its saved position with its own reciter and makes him the selected reciter. On Listen the row's name tap selects, and the `⋯` button selects, then opens the page. **Selecting an uninstalled reciter while another plays** starts downloading his pack at once, with the progress shown on his Listen row; when the download finishes, playback switches at the same place (decision 6: the start of the current ayah, still playing; the surah's beginning without usable timings; the unavailable state if he lacks the surah). The pending switch is cancelled if the user selects another reciter or playback stops before the download ends. If the download fails, the current playback continues and the existing download error is shown.
   Q12 failure: the selection reverts to the playing reciter (developer, 5 Nov 2026).

## Frame notes

- The full player is always dark (design system, "The full-screen player is always dark"), so `PlayerReciters` and `PlayerReciterDownloading` have no light version. `ReadingMiniUnavailable`, `ReadingMiniSkipped` and `ReciterSurahsUnavailable` are light only, like their source frames.
- `ReadingMiniUnavailable` uses the reader's idle bar (ADR 0024, unchanged by ADR 0059). The playing notice (decision 2) is drawn on the Listen tab, where the tabs bar shows while audio plays (ADR 0059 §1).
- The player frames use surah 37 (الصافات) because the disabled row needs a surah that the reciter lacks. They show verse 2, with the text taken verbatim from the Tanzil Uthmani file and not typed.
- **Design note (basmala):** the Tanzil Uthmani file carries the basmala inside verse 1 of every surah except 9, 95 and 97 (for example 2:1 and 37:1; surah 1 is the basmala itself). The frames avoid verse 1 for that reason. How the app shows that prefix is not decided here and needs its own decision before verse 1 is shown.

## Consequences

- **Positive:** the user always knows why a surah does not play, and the way out (change reciter, or download the reciter's pack) is one tap away. Nothing starts and then fails.
- **Positive:** the player has one utility row with no dead control, and the transport area is unchanged by the speed removal.
- **Negative:** the full player has no artwork in the reciters layout, so the player's visual identity is carried by the ayah card and the list. The list is always visible and fits on a 390 × 844 screen.
- **Code (to implement):** a per-reciter surah availability check; the mini bar's unavailable and notice states; the surah list's unavailable row; the speed feature removed (UI, store state, persisted setting, i18n strings, tests); the reciters list with download and auto-play on finish. Each component in its own file with a colocated test, strings in `ar` and `en`, RTL, and accessibility labels as in the frames.

## Alternatives considered

- **Start the surah and fail with an error.** Rejected: a tap must not lead to a dead state, and ADR 0061 says the surah is skipped.
- **Hide unavailable surahs from the list.** Rejected: the user should see why a surah is missing when they look for it.
- **Keep the artwork and scroll the list.** Rejected by the developer: the artwork is dropped from the reciters layout.
- **Move speed to Settings.** Rejected by the developer: speed is removed from the app entirely.

## Decided open questions (4 Nov 2026)

1. **Playback speed:** removed from the app entirely (see decision 4). Not kept in Settings.
2. **Artwork in the reciters state:** dropped entirely (see decision 5).
3. **Example surah and reciter:** surah 37 (الصافات) with إسلام صبحي, as drawn in the frames.
