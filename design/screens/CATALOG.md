# Frame catalog

Token-cheap inventory. **Models: read this or `frames.tsv`, not HTML frames.**

Total: **230** frames · **23** stacks

| id | stack | size | theme | status | caption |
|---|---|---|---|---|---|
| `Main` | core | compact | ar-light | source | Home |
| `MainLandscapeRail` | core | compact-short | ar-light | awaiting-approval | الرئيسية · أفقي، الشريط الرأسي ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `Mushaf` | core | compact | ar-light | source | Mushaf page · Uthmani Hafs (the app draws the ﴿ ﴾ end-of-ayah marks inline, so the recited one turns brand) |
| `MushafFullscreenEnter` | core | compact | ar-light | source | Mushaf · full screen button in the tools pill (ADR 0071) |
| `MushafFullscreen` | core | compact | ar-light | source | Mushaf · full screen: no toolbar, player, status bar or Android navigation bar; the exit button sits where the full screen button was; audio keeps playing (ADR 0071) |
| `AyahSheet` | core | compact | ar-light | source | Ayah actions · mid detent (50%) |
| `Player` | core | compact | ar-light | source | Player |
| `PlayerReciters` | core | compact | ar-light | source | Player, no artwork (ADR 0062 option b). Reciter name, surah, ayah card, progress, transport and the utility bar (repeat, ayah range, sleep timer; speed removed). Reciters list always visible under the controls: current reciter selected (checkmark); installed row is a button that switches reciter; not-downloaded row has a 44 pt download button; a reciter without the current surah (37) is disabled with «غير متوفرة لهذه السورة». Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `PlayerReciterDownloading` | core | compact | ar-light | source | Player, no artwork. After tapping download on «محمود خليل الحصري»: that row shows the progress bar (player colours) and a 44 pt stop button. Caption annotation: «يبدأ التشغيل تلقائيًا عند انتهاء التنزيل» (when the download finishes, the player switches to that reciter and auto-plays from the current ayah). Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `ReaderSettings` | core | compact | ar-light | source | Reader settings · mid detent (50%) |
| `SurahIndex` | reading | compact | ar-light | source | Surah index |
| `Search` | reading | compact | ar-light | source | Search |
| `Reading` | reading | compact | ar-light | source | Reading mode |
| `ReadingMiniIdle` | reading | compact | ar-light | source | Reading · mini player idle (plays from the top ayah on screen) |
| `ReadingMiniCollapsed` | reading | compact | ar-light | source | Reading · mini player collapsed (drag down to hide, drag up or tap to show) |
| `ReadingMiniUnavailable` | reading | compact | ar-light | source | Reading · mini player, surah unavailable for the reciter (surah 37 الصافات with إسلام صبحي; play was pressed, nothing plays, no progress state). Info glyph and message; «تغيير القارئ» opens the reciter picker (44 pt target). Idle reader rule (ADR 0059) so the bar stays on the reader. Approved 4 Nov 2026 (ADR 0062) |
| `ReadingMiniSkipped` | reading | compact | ar-light | source | Mini player, playing · continuous play skipped surah 37 (moved 36 → 38). Shows surah ص playing normally, plus a secondary line «تخطّي الصافات · غير متوفرة بصوت إسلام صبحي». The notice is transient: it shows for about 4 s, then the line disappears. VoiceOver announces it (role=status, polite). Approved 4 Nov 2026 (ADR 0062) |
| `Focus` | reading | compact | ar-light | source | Focus mode |
| `Tafsir` | reading | compact | ar-light | source | Tafsir · mid detent (50%) |
| `TafsirFull` | reading | compact | ar-light | source | Tafsir · full detent |
| `TafsirDownload` | reading | compact | ar-light | source | Tafsir · not downloaded · mid detent (50%) |
| `Salah` | salah | compact | ar-light | source | الصلاة |
| `SalahAdhanSoundEntry` | salah | compact | dark | source | الصلاة · صوت الأذان (الرأس — انظر #Salah / #SalahDark؛ ADR 0057) |
| `SalahDark` | salah | compact | dark | source | الصلاة · Dark |
| `Qibla` | salah | compact | ar-light | source | اتجاه القبلة · القرص ثابت والإبرة تتبع القبلة (ADR 0049) |
| `QiblaLandscape` | salah | compact-short | ar-light | awaiting-approval | اتجاه القبلة · أفقي، ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `MyQuran` | my-quran | compact | ar-light | source | My Quran |
| `Reciters` | audio | compact | ar-light | source | Reciters |
| `ReciterSurahsUnavailable` | salah | compact | ar-light | source | Listen › إسلام صبحي · surah list, rows 35–41 (same row styling as SurahIndex; header as Reciters). Surahs 37 الصافات, 39 الزمر and 40 غافر are missing from this reciter: dimmed (ink-muted), trailing label «غير متوفرة» instead of the play or download control, not tappable (no link, aria-disabled). Others are normal. Approved 4 Nov 2026 (ADR 0062) |
| `Settings` | settings | compact | ar-light | source | Settings |
| `AdhanSoundPicker` | settings | compact | ar-light | source | صوت الأذان |
| `AdhanSoundPickerDark` | settings | compact | dark | source | صوت الأذان · Dark |
| `SettingsAdhanSoundRow` | settings | compact | ar-light | source | الإعدادات · صوت الأذان |
| `SettingsSuggestCard` | salah | compact | ar-light | source | الإعدادات · اقترح فكرة (ADR 0066) |
| `SuggestSheet` | salah | compact | ar-light | source | اقترح فكرة · sheet |
| `SuggestSheetError` | salah | compact | ar-light | source | اقترح فكرة · خطأ في البريد |
| `SuggestSheetSending` | salah | compact | ar-light | source | اقترح فكرة · جارٍ الإرسال |
| `SuggestSheetSent` | salah | compact | ar-light | source | اقترح فكرة · تم الإرسال |
| `SuggestSheetOffline` | salah | compact | ar-light | source | اقترح فكرة · بدون اتصال |
| `SuggestSheetDark` | salah | compact | dark | source | اقترح فكرة · Dark |
| `SuggestSheetEnglish` | salah | compact | en | source | Suggest an idea · English (LTR) |
| `Sources` | settings | compact | ar-light | source | Sources |
| `SignIn` | account | compact | ar-light | source | Sign in |
| `VerifyCode` | account | compact | ar-light | source | Verify code |
| `MainAzkar` | azkar | compact | ar-light | source | Home · Azkar tile (ADR 0017) |
| `SalahAzkar` | azkar | compact | ar-light | source | الصلاة · أذكار بعد الصلاة |
| `AzkarHome` | azkar | compact | ar-light | awaiting-approval | Azkar home · proposed |
| `AzkarHomeDark` | azkar | compact | dark | source | Azkar home · Dark |
| `AzkarHomeEnglish` | azkar | compact | en | source | Azkar home · English (LTR) |
| `AzkarLoading` | azkar | compact | ar-light | source | Azkar home · loading |
| `AzkarCategory` | azkar | compact | ar-light | source | Category · morning azkar |
| `AzkarSearch` | azkar | compact | ar-light | source | Search · results |
| `AzkarSearchEmpty` | azkar | compact | ar-light | source | Search · empty query, recent searches |
| `AzkarFavorites` | azkar | compact | ar-light | source | Favourites |
| `AzkarFavoritesEmpty` | azkar | compact | ar-light | source | Empty · favourites |
| `AzkarUnavailable` | azkar | compact | ar-light | source | Azkar · unavailable (direct route) |
| `AzkarReader` | azkar | compact | ar-light | source | Reader · counted item |
| `AzkarReaderDark` | azkar | compact | dark | source | Reader · Dark |
| `AzkarReaderDone` | azkar | compact | ar-light | source | Reader · item without a sourced count (single ring) |
| `AzkarReaderComplete` | azkar | compact | ar-light | source | Reader · session complete |
| `AzkarReaderAudio` | azkar | compact | ar-light | source | Reader · licensed recording |
| `AzkarPlayer` | azkar | compact | ar-light | awaiting-approval | Azkar player · full sheet · light · بانتظار الموافقة |
| `AzkarPlayerDark` | azkar | compact | dark | awaiting-approval | Azkar player · full sheet · dark · بانتظار الموافقة |
| `AzkarDetails` | azkar | compact | ar-light | source | Source and details · sheet (mid) |
| `AzkarDetailsFull` | azkar | compact | ar-light | source | Source and details · full, every section |
| `AzkarReminders` | azkar | compact | ar-light | source | Reminders · sheet |
| `AzkarRemindersDenied` | azkar | compact | ar-light | source | Reminders · notifications denied |
| `AzkarDownloads` | azkar | compact | ar-light | source | Downloads · licensed recording (future) |
| `AzkarDownloadsEmpty` | azkar | compact | ar-light | source | Empty · recordings (licensed recording, future) |
| `AzkarExpanded` | azkar | expanded | ar-light | source | Azkar reader · expanded · 1194 × 834 |
| `DuasHome` | duas | compact | ar-light | source | الأدعية · Arabic |
| `DuasHomeDark` | duas | compact | dark | source | الأدعية · Dark |
| `DuasHomeEnglish` | duas | compact | en | source | Duas home · English (LTR) |
| `DuaQuranDetail` | duas | compact | ar-light | source | دعاء قرآني · Arabic |
| `DuaQuranDetailDark` | duas | compact | dark | source | دعاء قرآني · Dark |
| `DuaQuranDetailEnglish` | duas | compact | en | source | Quranic dua · English (LTR) |
| `DuaHadithDetail` | duas | compact | ar-light | source | دعاء نبوي · Arabic |
| `DuaHadithDetailDark` | duas | compact | dark | source | دعاء نبوي · Dark |
| `DuaHadithDetailEnglish` | duas | compact | en | source | Prophetic dua · English (LTR) |
| `MyDuas` | duas | compact | ar-light | source | أدعيتي · Arabic |
| `MyDuasDark` | duas | compact | dark | source | أدعيتي · Dark |
| `MyDuasEnglish` | duas | compact | en | source | My duas · English (LTR) |
| `MyDuaEditor` | duas | compact | ar-light | source | تحرير الدعاء · Arabic |
| `MyDuaEditorDark` | duas | compact | dark | source | تحرير الدعاء · Dark |
| `MyDuaEditorEnglish` | duas | compact | en | source | My dua editor · English (LTR) |
| `MyDuasEmpty` | duas | compact | ar-light | source | أدعيتي · فارغة |
| `MyDuasEmptyEnglish` | duas | compact | en | source | My duas · empty · English (LTR) |
| `Menu` | menu | compact | ar-light | source | Menu tab · Arabic |
| `MenuDark` | menu | compact | dark | source | Menu tab · Dark |
| `MenuEnglish` | menu | compact | en | source | Menu tab · English (LTR) |
| `MainMenuTab` | menu | compact | ar-light | source | Home · tab bar with القائمة (ADR 0032) |
| `MenuV2` | menu-v2 | compact | ar-light | source | Menu V2 · Arabic |
| `MenuV2Dark` | menu-v2 | compact | dark | source | Menu V2 · Dark |
| `MenuV2Accent` | menu-v2 | compact | ar-light | source | Menu V2 · option D2, green prayer card |
| `HomeAzkar` | home | compact | ar-light | source | Home · top: reading, next prayer, azkar |
| `HomeAzkarLower` | home | compact | ar-light | source | Home · scrolled: progress, tiles, picks |
| `HomeAzkarRecent` | home | compact | ar-light | source | Home · scrolled: recent azkar and listens |
| `HomeAzkarDark` | home | compact | dark | source | Home · top · Dark |
| `HomeAzkarLowerDark` | home | compact | dark | source | Home · scrolled · Dark |
| `HomeAzkarEnglish` | home | compact | en | source | Home · top · English (LTR) |
| `Sibha` | home | compact | ar-light | source | Misbaha · counter |
| `SibhaLandscape` | home | compact-short | ar-light | awaiting-approval | Misbaha · أفقي، ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `SibhaDark` | home | compact | dark | source | Misbaha · counter · Dark |
| `SibhaResetDialog` | home | compact | ar-light | source | Misbaha · reset confirmation |
| `SibhaResetDialogDark` | home | compact | dark | source | Misbaha · reset confirmation, dark |
| `DailyGoalsSheet` | home | compact | ar-light | source | Daily goals · sheet |
| `HomeDailyProgressEmpty` | home | compact | ar-light | source | Home · daily progress · empty state |
| `HomeNextPrayerNoLocation` | home | compact | ar-light | source | Home · next prayer · no location |
| `OnboardLanguage` | onboarding | compact | ar-light | source | Onboarding 1 · Language |
| `OnboardScript` | onboarding | compact | ar-light | source | Onboarding 2 · Script |
| `OnboardReciter` | onboarding | compact | ar-light | source | Onboarding 3 · Reciter |
| `Khatma` | account | compact | ar-light | source | Khatma planner |
| `Downloads` | account | compact | ar-light | source | Downloads &amp; storage |
| `Account` | account | compact | ar-light | source | Account (signed in) |
| `DeleteAccount` | account | compact | ar-light | source | Delete account |
| `Offline` | states | compact | ar-light | source | Offline · tafsir missing |
| `EmptyMyQuran` | my-quran | compact | ar-light | source | Empty · My Quran |
| `HomeDark` | states | compact | dark | source | Home · dark |
| `HomeEnglish` | states | compact | en | source | Home · English |
| `HomeAndroid` | states | compact | ar-light | source | Home · Android |
| `Hadith` | hadith | compact | ar-light | source | Hadith · deferred: HadeethEnc, ADR 0042 |
| `HadithDetail` | hadith | compact | ar-light | source | Hadith detail · deferred: HadeethEnc, ADR 0042 |
| `HadithDetailEnglish` | hadith | compact | en | source | Hadith detail · English · deferred: HadeethEnc, ADR 0042 |
| `LoadingReciters` | audio | compact | ar-light | source | Reciters · loading (first sync) |
| `LoadingHome` | states | compact | ar-light | source | Home · loading (first launch) |
| `LoadingIndex` | states | compact | ar-light | source | Surah index · loading (first launch) |
| `LoadingTafsir` | states | compact | ar-light | source | Tafsir · loading |
| `LoadingMushaf` | states | compact | ar-light | source | Mushaf page · page-exact font loading |
| `PlayerBuffering` | audio | compact | ar-light | source | Player · buffering |
| `WidgetNextPrayerSmall` | widgets | compact | ar-light | source | iOS widget · next prayer · small, small (no location), medium · Light |
| `WidgetNextPrayerSmallDark` | widgets | compact | dark | source | iOS widget · next prayer · small, small (no location), medium · Dark |
| `WidgetProgressMedium` | widgets | compact | ar-light | source | iOS widget · daily progress · small, small (empty), medium, large · Light |
| `WidgetProgressMediumDark` | widgets | compact | dark | source | iOS widget · daily progress · small, small (empty), medium, large · Dark |
| `WidgetContinueReading` | widgets | compact | ar-light | source | iOS widget · continue reading + wird, misbaha, Azkar status (gated) · Light |
| `WidgetContinueReadingDark` | widgets | compact | dark | source | iOS widget · continue reading + wird, misbaha, Azkar status (gated) · Dark |
| `WidgetLockScreen` | widgets | compact | ar-light | source | iOS lock screen · inline, rectangular, circular · Light wallpaper |
| `WidgetLockScreenDark` | widgets | compact | dark | source | iOS lock screen · inline, rectangular, circular · Dark wallpaper |
| `AndroidWidgets` | widgets | compact | ar-light | source | Android home screen widgets · 2×2 and 4×2 · Light |
| `AndroidWidgetsDark` | widgets | compact | dark | source | Android home screen widgets · 2×2 and 4×2 · Dark |
| `WatchHome` | watch | compact | dark | source | Apple Watch · home (dark only, watchOS) · 41 mm |
| `WatchSibha` | watch | compact | dark | source | Apple Watch · misbaha (dark only, watchOS) · 41 mm |
| `WatchComplications` | watch | compact | dark | source | Apple Watch · complications (dark only, watchOS) · 41 mm |
| `ExpandedHome` | expanded | expanded | ar-light | source | Home · expanded · 1194 × 834 |
| `ExpandedHomeDark` | expanded | expanded | dark | source | Home · expanded · dark |
| `ReaderExpandedActions` | expanded | expanded | ar-light | source | Reader · expanded · ayah actions in the side panel · 1194 × 834 |
| `ReaderExpandedTafsir` | expanded | expanded | ar-light | source | Reader · expanded · reading mode with tafsir in the side panel |
| `ReaderOverlayTafsir` | expanded | expanded | ar-light | source | Reader · expanded, 840–1,099 pt (iPad portrait) · tafsir panel over a dimmed page; tap the page to close (fix plan step 1) |
| `ReaderExpandedDark` | expanded | expanded | dark | source | Reader · expanded · dark |
| `ReaderMedium` | expanded | medium | ar-light | source | Reader · medium · 744 × 1133 · ayah actions as a sheet |
| `AsmaaList` | asmaa | compact | ar-light | source | Names of Allah · list · Arabic |
| `AsmaaListDark` | asmaa | compact | dark | source | Names of Allah · list · dark |
| `AsmaaListEnglish` | asmaa | compact | en | source | Names of Allah · list · English (LTR) |
| `AsmaaDetail` | asmaa | compact | ar-light | source | Name detail · Arabic (no meaning: unlicensed, section hidden) |
| `AsmaaDetailDark` | asmaa | compact | dark | source | Name detail · dark |
| `HijriCalendar` | hijri | compact | ar-light | source | Hijri calendar · month view · Arabic |
| `HijriCalendarDark` | hijri | compact | dark | source | Hijri calendar · dark |
| `HijriCalendarEnglish` | hijri | compact | en | source | Hijri calendar · English (LTR) |
| `HijriAdjust` | hijri | compact | ar-light | source | Adjust the Hijri date · sheet (+1 selected) |
| `HijriAdjustDark` | hijri | compact | dark | source | Adjust the Hijri date · dark |
| `MoonSighting` | moon | compact | ar-light | source | Moon sighting · Arabic |
| `MoonSightingDark` | moon | compact | dark | source | Moon sighting · dark |
| `MoonSightingEnglish` | moon | compact | en | source | Moon sighting · English (LTR) |
| `MoonSightingNoLocation` | moon | compact | ar-light | source | Moon sighting · no location |
| `MenuNewCards` | entry-points | compact | ar-light | source | Menu · new cards · Arabic |
| `MenuNewCardsDark` | entry-points | compact | dark | source | Menu · new cards · dark |
| `MenuNewCardsEnglish` | entry-points | compact | en | source | Menu · new cards · English (LTR) |
| `HomeHijriDate` | entry-points | compact | ar-light | source | Home · Hijri date line · Arabic |
| `HomeHijriDateDark` | entry-points | compact | dark | source | Home · Hijri date line · dark |
| `DiscoverCard` | discover | compact | ar-light | awaiting-approval | Home · Discover card · in progress · Arabic · Light · awaiting approval |
| `DiscoverCardNew` | discover | compact | ar-light | awaiting-approval | Home · Discover card · only new rows marked جديد · Arabic · Light · awaiting approval |
| `DiscoverCardDone` | discover | compact | ar-light | awaiting-approval | Home · Discover card · all done (أحسنت) · Arabic · Light · awaiting approval |
| `DiscoverScreen` | discover | compact | ar-light | awaiting-approval | Discover · full checklist · Arabic · Light · awaiting approval |
| `DiscoverTip` | discover | compact | ar-light | awaiting-approval | Reader settings · one-time tip · Arabic · Light · awaiting approval |
| `DiscoverWidgetSheet` | discover | compact | ar-light | awaiting-approval | Discover · add widget sheet · Arabic · Light · awaiting approval |
| `WidgetsHelp` | widgets | compact | ar-light | awaiting-approval | Settings · widgets and watch help · Arabic · Light · awaiting approval |
| `WidgetsHelpDark` | widgets | compact | dark | awaiting-approval | Settings · widgets and watch help · Arabic · Dark · awaiting approval |
| `WidgetAddConfirm` | widgets | compact | ar-light | source | Widgets · add confirm · next prayer · Arabic · Light (ADR 0054) |
| `WidgetAddConfirmDark` | widgets | compact | dark | source | Widgets · add confirm · next prayer · Arabic · Dark (ADR 0054) |
| `WidgetAddConfirmAlready` | widgets | compact | ar-light | source | Widgets · already on home · Arabic · Light (ADR 0054) |
| `WidgetAddConfirmAlreadyDark` | widgets | compact | dark | source | Widgets · already on home · Arabic · Dark (ADR 0054) |
| `HadithCollCovers` | hadith | compact | ar-light | source | Hadith collection covers · light · Arabic |
| `HadithCollCoversSepia` | hadith | compact | ar-light | source | Hadith collection covers · sepia · Arabic |
| `HadithCollCoversDark` | hadith | compact | dark | source | Hadith collection covers · dark · Arabic |
| `HadithCollList` | hadith | compact | ar-light | source | Hadith collections · list · Arabic |
| `HadithCollListDark` | hadith | compact | dark | source | Hadith collections · list · dark · Arabic |
| `HadithCollListEnglish` | hadith | compact | en | source | Hadith collections · list · English |
| `HadithCollUntitled` | hadith | compact | ar-light | source | Hadith collections · untitled fallback · Arabic |
| `HadithCollUntitledDark` | hadith | compact | dark | source | Hadith collections · untitled fallback · dark · Arabic |
| `HadithCollUntitledEnglish` | hadith | compact | en | source | Hadith collections · untitled fallback · English |
| `HadithCollUntitledBooks` | hadith | compact | ar-light | source | Hadith books · untitled collection · Arabic |
| `HadithCollUntitledBooksDark` | hadith | compact | dark | source | Hadith books · untitled collection · dark · Arabic |
| `HadithCollUntitledBooksEnglish` | hadith | compact | en | source | Hadith books · untitled collection · English |
| `HadithCollBooks` | hadith | compact | ar-light | source | Hadith collection · books · Arabic |
| `HadithCollBooksDark` | hadith | compact | dark | source | Hadith collection · books · dark |
| `HadithCollBooksEnglish` | hadith | compact | en | source | Hadith collection · books · English |
| `HadithCollBook` | hadith | compact | ar-light | source | Hadith book · hadith list · Arabic |
| `HadithCollBookDark` | hadith | compact | dark | source | Hadith book · hadith list · dark |
| `HadithCollBookEnglish` | hadith | compact | en | source | Hadith book · hadith list · English |
| `HadithCollSingle` | hadith | compact | ar-light | source | Hadith single-book collection · Arabic |
| `HadithCollSingleDark` | hadith | compact | dark | source | Hadith single-book collection · dark |
| `HadithCollSingleEnglish` | hadith | compact | en | source | Hadith single-book collection · English |
| `HadithCollChapters` | hadith | compact | ar-light | source | Hadith chapters · list · Arabic |
| `HadithCollChaptersDark` | hadith | compact | dark | source | Hadith chapters · list · dark |
| `HadithCollChaptersEnglish` | hadith | compact | en | source | Hadith chapters · list · English |
| `HadithCollChapterHadith` | hadith | compact | ar-light | source | Hadith chapter · hadith list · Arabic |
| `HadithCollChapterHadithDark` | hadith | compact | dark | source | Hadith chapter · hadith list · dark |
| `HadithCollChapterHadithEnglish` | hadith | compact | en | source | Hadith chapter · hadith list · English |
| `HadithCollReader` | hadith | compact | ar-light | source | Hadith reader · Arabic |
| `HadithCollReaderDark` | hadith | compact | dark | source | Hadith reader · dark |
| `HadithCollReaderEnglish` | hadith | compact | en | source | Hadith reader · English |
| `HadithCollReaderPlain` | hadith | compact | ar-light | source | Hadith reader · single-colour fallback (source does not mark the chain) · Arabic |
| `HadithCollReaderGrade` | hadith | compact | ar-light | source | Hadith reader · future state: grade (not built, labelled) · Arabic |
| `HadithCollSearch` | hadith | compact | ar-light | source | Hadith search · empty query · Arabic |
| `HadithCollSearchResults` | hadith | compact | ar-light | source | Hadith search · results · Arabic |
| `HadithCollSearchEmpty` | hadith | compact | ar-light | source | Hadith search · no results · Arabic |
| `HadithCollDownload` | hadith | compact | ar-light | source | Hadith collection download · downloading · sheet (50%) |
| `HadithCollLoading` | hadith | compact | ar-light | source | Hadith collections · loading · Arabic |
| `HadithCollOffline` | hadith | compact | ar-light | source | Hadith collections · offline, nothing downloaded · Arabic |
| `HadithCollOfflineDownloaded` | hadith | compact | ar-light | source | Hadith collections · offline, some downloaded · Arabic |
| `HadithCollDownloadFailed` | hadith | compact | ar-light | source | Hadith collections · download failed · Arabic |
| `HadithCollError` | hadith | compact | ar-light | source | Hadith collections · error · Arabic |
| `HadithCollSaved` | hadith | compact | ar-light | source | Saved hadith · list · Arabic |
| `HadithCollSavedUnverified` | hadith | compact | ar-light | source | Saved hadith · unverified notice · Arabic |
| `HadithCollSavedEmpty` | hadith | compact | ar-light | source | Empty · saved hadith · Arabic |
| `HadithCollExpanded` | hadith | expanded | ar-light | source | Hadith · expanded window · 1194 × 834 · tab rail, books pane, book list |
| `HadithCollExpandedReader` | hadith | expanded | ar-light | source | Hadith reader · expanded window · 1194 × 834 · tab rail, books pane, side panel |
| `HadithCollMenu` | hadith | compact | ar-light | source | Menu · new cards · Hadith entry · Arabic |
| `HadithCollMenuDark` | hadith | compact | dark | source | Menu · new cards · Hadith entry · dark |
| `HadithCollMenuEnglish` | hadith | compact | en | source | Menu · new cards · Hadith entry · English |
| `HadithCollSources` | hadith | compact | ar-light | source | Settings · المصادر والشكر · Hadith row added |
