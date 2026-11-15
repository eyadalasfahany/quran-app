# Frame catalog

Token-cheap inventory. **Models: read this or `frames.tsv`, not HTML frames.**

Total: **307** frames · **24** stacks

| id | stack | size | theme | status | caption |
|---|---|---|---|---|---|
| `Main` | core | compact | ar-light | source | Home |
| `MainLandscapeRail` | core | compact-short | ar-light | awaiting-approval | الرئيسية · أفقي، الشريط الرأسي ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `Mushaf` | core | compact | ar-light | source | Mushaf page · Uthmani Hafs (the app draws the ﴿ ﴾ end-of-ayah marks inline, so the recited one turns brand) |
| `MushafPlaybackRiwayah` | core | compact | ar-light | awaiting-approval | Mushaf · Hafs pages while a Hafs reciter plays for a reader who chose Warsh (ADR 0090 decision 12, step 9b Q6) (بانتظار الموافقة) |
| `MushafFullscreenEnter` | core | compact | ar-light | source | Mushaf · full screen button in the tools pill (ADR 0071) |
| `MushafFullscreen` | core | compact | ar-light | source | Mushaf · full screen: no toolbar, player, status bar or Android navigation bar; the exit button sits where the full screen button was; audio keeps playing (ADR 0071) |
| `AyahSheet` | core | compact | ar-light | source | Ayah actions · mid detent (50%) |
| `AyahSheetRiwayah` | core | compact | ar-light | awaiting-approval | Ayah actions · ayah in Warsh (non-Hafs): reference and riwayah in the header, no text card, highlight row, and only حفظ and ملاحظة (ADR 0090, step 9 Part F) (بانتظار الموافقة) |
| `Player` | core | compact | ar-light | source | Player |
| `PlayerReciters` | core | compact | ar-light | source | Player, no artwork (ADR 0062 option b). Reciter name, surah, ayah card, progress, transport and the utility bar (repeat, ayah range, sleep timer; speed removed). Reciters list always visible under the controls: current reciter selected (checkmark); installed row is a button that switches reciter; not-downloaded row has a 44 pt download button; a reciter without the current surah (37) is disabled with «غير متوفرة لهذه السورة». Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `PlayerReciterDownloading` | core | compact | ar-light | source | Player, no artwork. After tapping download on «محمود خليل الحصري»: that row shows the progress bar (player colours) and a 44 pt stop button. Caption annotation: «يبدأ التشغيل تلقائيًا عند انتهاء التنزيل» (when the download finishes, the player switches to that reciter and auto-plays from the current ayah). Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `ReaderSettings` | core | compact | ar-light | source | Reader settings · mid detent (50%) |
| `SurahIndex` | reading | compact | ar-light | source | Surah index |
| `Search` | reading | compact | ar-light | source | Search |
| `SearchEmpty` | reading | compact | ar-light | source | البحث · القرآن، بلا كلمة بحث |
| `SearchHadithEmpty` | reading | compact | ar-light | source | البحث · الحديث، بلا كلمة بحث |
| `Reading` | reading | compact | ar-light | source | Reading mode |
| `ReadingOtherRiwayah` | reading | compact | ar-light | awaiting-approval | Reading mode · Warsh chosen: the title pill names Hafs, the text shown (step 9 Part G) (بانتظار الموافقة) |
| `ReadingMiniIdle` | reading | compact | ar-light | source | Reading · mini player idle (plays from the top ayah on screen) |
| `ReadingMiniCollapsed` | reading | compact | ar-light | source | Reading · mini player collapsed (drag down to hide, drag up or tap to show) |
| `ReadingMiniUnavailable` | reading | compact | ar-light | source | Reading · mini player, surah unavailable for the reciter (surah 37 الصافات with إسلام صبحي; play was pressed, nothing plays, no progress state). Info glyph and message; «تغيير القارئ» opens the reciter picker (44 pt target). Idle reader rule (ADR 0059) so the bar stays on the reader. Approved 4 Nov 2026 (ADR 0062) |
| `ReadingMiniSkipped` | reading | compact | ar-light | source | Mini player, playing · continuous play skipped surah 37 (moved 36 → 38). Shows surah ص playing normally, plus a secondary line «تخطّي الصافات · غير متوفرة بصوت إسلام صبحي». The notice is transient: it shows for about 4 s, then the line disappears. VoiceOver announces it (role=status, polite). Approved 4 Nov 2026 (ADR 0062) |
| `Focus` | reading | compact | ar-light | source | Focus mode |
| `FocusOtherRiwayah` | reading | compact | ar-light | awaiting-approval | Focus mode · Warsh chosen: the position line names Hafs, the text shown (step 9 Part G) (بانتظار الموافقة) |
| `Tafsir` | reading | compact | ar-light | source | Tafsir · mid detent (50%) |
| `TafsirFull` | reading | compact | ar-light | source | Tafsir · full detent |
| `TafsirDownload` | reading | compact | ar-light | source | Tafsir · not downloaded · mid detent (50%) |
| `Salah` | salah | compact | ar-light | awaiting-approval | الصلاة · زر رجوع وسطر التاريخ تحت العنوان (ADR 0081, 0089، بانتظار الموافقة) |
| `SalahAdhanSoundEntry` | salah | compact | dark | source | الصلاة · صوت الأذان (الرأس — انظر #Salah / #SalahDark؛ ADR 0057) |
| `SalahDark` | salah | compact | dark | awaiting-approval | الصلاة · Dark (ADR 0089, بانتظار الموافقة) |
| `Qibla` | salah | compact | ar-light | source | اتجاه القبلة · القرص ثابت والإبرة تتبع القبلة (ADR 0049) |
| `QiblaLandscape` | salah | compact-short | ar-light | awaiting-approval | اتجاه القبلة · أفقي، ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `MyQuran` | my-quran | compact | ar-light | source | My Quran |
| `Reciters` | audio | compact | ar-light | source | Reciters |
| `RecitersRiwayahRow` | salah | compact | ar-light | awaiting-approval | Listen › Reciters · each row names its riwayah on the second line (ADR 0090 decision 12, step 9b Part C, option a) (بانتظار الموافقة) |
| `RecitersRiwayahHeader` | salah | compact | ar-light | awaiting-approval | Listen › Reciters · one muted line above the list, rows unchanged (ADR 0090 decision 12, step 9b Part C, option b) (بانتظار الموافقة) |
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
| `AzkarCategoryQuranRef` | azkar | compact | ar-light | awaiting-approval | Category · card with its Quran reference under the preview (ADR 0090) (بانتظار الموافقة) |
| `AzkarChapters` | azkar | compact | ar-light | awaiting-approval | كل الأبواب · the 132 chapters in book order; a row opens the AzkarCategory layout for that chapter (بانتظار الموافقة) |
| `AzkarSearch` | azkar | compact | ar-light | source | Search · results |
| `AzkarSearchEmpty` | azkar | compact | ar-light | source | Search · empty query, recent searches |
| `AzkarFavorites` | azkar | compact | ar-light | source | Favourites |
| `AzkarFavoritesEmpty` | azkar | compact | ar-light | source | Empty · favourites |
| `AzkarUnavailable` | azkar | compact | ar-light | source | Azkar · unavailable (direct route) |
| `AzkarReader` | azkar | compact | ar-light | source | Reader · counted item |
| `AzkarReaderDark` | azkar | compact | dark | source | Reader · Dark |
| `AzkarReaderDone` | azkar | compact | ar-light | source | Reader · item without a sourced count (single ring) |
| `AzkarReaderSingleIdle` | azkar | compact | ar-light | source | Reader · no sourced count, before the tap: empty ring, «اضغط عند الانتهاء», no check (replaces AzkarReaderDone) (approved 15 Nov 2026) |
| `AzkarReaderSingleDone` | azkar | compact | ar-light | source | Reader · no sourced count, after the tap: full ring, check and «تم» (approved 15 Nov 2026) |
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
| `DuasHome` | duas | compact | ar-light | source | الأدعية · on the Azkar home layout (ADR 0092 decision 5): Azkar header, «أدعيتي» card, «التصنيفات» in the Azkar section title and Azkar tiles (body 600 name, caption count, 16 pt padding, 88 pt min height, 12 pt gap). Order: «من القرآن الكريم», the five hadith dua books (collection names from config/hadith_titles.php), the HadeethEnc groups (titles as received), then the single-name topics (config/azkar_topics.php); first eight shown, «عرض الكل» expands in place; no sources card, no credit line; counts are mock (approved 15 Nov 2026) |
| `DuasHomeDark` | duas | compact | dark | source | الأدعية · Dark, same layout as DuasHome (approved 15 Nov 2026) |
| `DuasHomeEnglish` | duas | compact | en | source | Duas home · English (LTR), same layout as DuasHome (approved 15 Nov 2026) |
| `DuasHomeCategories` | duas | compact | ar-light | source | الأدعية · «عرض الكل» expanded in place: every category in the Azkar tiles (Quran, hadith books, HadeethEnc groups, topics), «عرض أقل» collapses; counts are mock (approved 15 Nov 2026) |
| `DuasLoading` | duas | compact | ar-light | source | الأدعية · loading: skeleton of the header, «أدعيتي» card and tiles (from AzkarLoading) (approved 15 Nov 2026) |
| `DuasUnavailable` | duas | compact | ar-light | source | الأدعية · unavailable (direct route, from AzkarUnavailable) (approved 15 Nov 2026) |
| `DuasHomeCategoriesExpanded` | duas | expanded | ar-light | source | الأدعية · expanded · 1194 × 834: tab rail with القائمة current, the phone layout in the 640 pt content column (approved 15 Nov 2026) |
| `DuasCategory` | duas | compact | ar-light | source | الأدعية · one category («الجنائز»): the Azkar category card, number and dua text only, no sources; a Hisn row opens DuaHisnDetail (approved 15 Nov 2026) |
| `DuasCategoryDark` | duas | compact | dark | source | الأدعية · one category · Dark (DuasCategory layout, topic «الجنائز») (approved 15 Nov 2026) |
| `DuasCategoryEnglish` | duas | compact | en | source | Duas · one category · English (LTR) (DuasCategory layout, topic Funerals) (approved 15 Nov 2026) |
| `DuasCategoryQuran` | duas | compact | ar-light | source | الأدعية · «من القرآن الكريم»: Azkar item cards with the ring badge, the ayah in the Quran face and its surah · ayah line under it (as AzkarCategoryQuranRef) (approved 15 Nov 2026) |
| `DuasSearch` | duas | compact | ar-light | source | الأدعية · search: categories first, then duas with their category; mirrors AzkarSearch (ADR 0091) (approved 15 Nov 2026) |
| `DuasSearchEmpty` | duas | compact | ar-light | source | الأدعية · search, empty query: recent searches and the hint (from AzkarSearchEmpty; no scope chips in Duas) (approved 15 Nov 2026) |
| `DuasSearchNoResults` | duas | compact | ar-light | source | الأدعية · search, no results: «لا توجد نتائج مطابقة» (approved 15 Nov 2026) |
| `DuasFavorites` | duas | compact | ar-light | source | الأدعية · المفضلة: Azkar favourite cards with the ring badge and the category under the text (from AzkarFavorites) (approved 15 Nov 2026) |
| `DuasFavoritesEmpty` | duas | compact | ar-light | source | الأدعية · المفضلة · empty (from AzkarFavoritesEmpty) (approved 15 Nov 2026) |
| `DuaQuranDetailNoSource` | duas | compact | ar-light | source | دعاء قرآني · without «المصدر والتفاصيل»; the surah and ayah stay (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaQuranDetail` | duas | compact | ar-light | source | دعاء قرآني · Arabic, rebased on DuaQuranDetailNoSource (surah · ayah line only) (approved 15 Nov 2026) |
| `DuaQuranDetailDark` | duas | compact | dark | source | دعاء قرآني · Dark, rebased on DuaQuranDetailNoSource (approved 15 Nov 2026) |
| `DuaQuranDetailEnglish` | duas | compact | en | source | Quranic dua · English (LTR), rebased on DuaQuranDetailNoSource (approved 15 Nov 2026) |
| `DuaQuranDetailAudio` | duas | compact | ar-light | source | دعاء قرآني · play button «تشغيل» in the action row beside Aa, share and save (ADR 0092 decision 3); «فتح في المصحف» stays in the pager row (approved 15 Nov 2026) |
| `DuaQuranDetailPlaying` | duas | compact | ar-light | source | دعاء قرآني · playing with the Quran player: the current ayah in a plain highlight-active background wash (the app draws it on React Native nested Text, which cannot draw the reader’s rounded box or inset bar), «إيقاف» in the action row, the reader player bar above the actions; both pause controls kept (developer) (approved 15 Nov 2026) |
| `DuaQuranDetailStarting` | duas | compact | ar-light | awaiting-approval | دعاء قرآني · starting: the play control shows the shared BufferingRing around the pause glyph (busy), as the reader’s play button does while audio loads (بانتظار الموافقة) |
| `DuaQuranDetailStartingDark` | duas | compact | dark | awaiting-approval | دعاء قرآني · starting · Dark (بانتظار الموافقة) |
| `DuaQuranDetailStartingEnglish` | duas | compact | en | awaiting-approval | Quranic dua · starting · English (LTR) (بانتظار الموافقة) |
| `DuaQuranDetailNoTimings` | duas | compact | ar-light | awaiting-approval | دعاء قرآني · reciter without ayah timings: «تشغيل» at the disabled opacity (0.45) and the PlayerErrorNotice under the action row (duas.quranPlay.noTimings), in page colours (بانتظار الموافقة) |
| `DuaQuranDetailNoTimingsDark` | duas | compact | dark | awaiting-approval | دعاء قرآني · no timings · Dark (بانتظار الموافقة) |
| `DuaQuranDetailNoTimingsEnglish` | duas | compact | en | awaiting-approval | Quranic dua · no timings · English (LTR) (بانتظار الموافقة) |
| `DuaHadithDetailNoSource` | duas | compact | ar-light | source | دعاء نبوي · without sources: no takhrij line, no links, no المرجع or الدرجة, no credit lines (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaHadithDetail` | duas | compact | ar-light | source | دعاء نبوي · Arabic, rebased on DuaHadithDetailNoSource; no play button (no licensed recording) (approved 15 Nov 2026) |
| `DuaHadithDetailDark` | duas | compact | dark | source | دعاء نبوي · Dark, rebased on DuaHadithDetailNoSource (approved 15 Nov 2026) |
| `DuaHadithDetailEnglish` | duas | compact | en | source | Prophetic dua · English (LTR), rebased on DuaHadithDetailNoSource (approved 15 Nov 2026) |
| `DuaHisnDetail` | duas | compact | ar-light | source | دعاء من حصن المسلم · text only: Azkar reader top bar, the dua text, save / share / Aa, previous and next chips; no counter, no source line (approved 15 Nov 2026) |
| `DuaHisnDetailDark` | duas | compact | dark | source | دعاء من حصن المسلم · Dark (approved 15 Nov 2026) |
| `DuaHisnDetailEnglish` | duas | compact | en | source | Hisn al-Muslim dua · English (LTR); the dua text stays Arabic (approved 15 Nov 2026) |
| `DuaHisnDetailAudio` | duas | compact | ar-light | source | دعاء من حصن المسلم · with its recording (ADR 0092 decision 3): play and download in the action row (from AzkarReaderAudio), no counter ring (approved 15 Nov 2026) |
| `DuaHisnDetailAudioPlaying` | duas | compact | ar-light | source | دعاء من حصن المسلم · playing: pause in the action row and the Azkar player bar (AzkarPlayerBar) above it, both kept (developer); the bar opens AzkarPlayer (approved 15 Nov 2026) |
| `DuaHisnDetailAudioOffline` | duas | compact | ar-light | source | دعاء من حصن المسلم · offline, not downloaded: «غير متاح دون اتصال» pill, no play control (approved 15 Nov 2026) |
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
| `HomeAzkar` | home | compact | ar-light | awaiting-approval | Home · top: reading, next prayer with Qibla, today's progress (ADR 0089, بانتظار الموافقة) |
| `HomeAzkarLower` | home | compact | ar-light | awaiting-approval | Home · scrolled: continue azkar, tiles by daily use, picks (ADR 0089, بانتظار الموافقة) |
| `HomeAzkarRecent` | home | compact | ar-light | source | Home · scrolled: recent azkar and listens |
| `HomeAzkarDark` | home | compact | dark | awaiting-approval | Home · top · Dark (ADR 0089, بانتظار الموافقة) |
| `HomeAzkarLowerDark` | home | compact | dark | awaiting-approval | Home · scrolled · Dark (ADR 0089, بانتظار الموافقة) |
| `HomeAzkarEnglish` | home | compact | en | awaiting-approval | Home · top · English (LTR) (ADR 0089, بانتظار الموافقة) |
| `Sibha` | home | compact | ar-light | source | Misbaha · counter |
| `SibhaLandscape` | home | compact-short | ar-light | awaiting-approval | Misbaha · أفقي، ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `SibhaDark` | home | compact | dark | source | Misbaha · counter · Dark |
| `SibhaResetDialog` | home | compact | ar-light | source | Misbaha · reset confirmation |
| `SibhaResetDialogDark` | home | compact | dark | source | Misbaha · reset confirmation, dark |
| `DailyGoalsSheet` | home | compact | ar-light | source | Daily goals · sheet |
| `HomeDailyProgressEmpty` | home | compact | ar-light | source | Home · daily progress · empty state |
| `HomeNextPrayerNoLocation` | home | compact | ar-light | source | Home · next prayer · no location |
| `OnboardLanguage` | onboarding | compact | ar-light | source | Onboarding 1 · Language |
| `OnboardTour` | onboarding | compact | ar-light | source | Onboarding 2 · ما في طيبة · the app's sections |
| `OnboardScript` | onboarding | compact | ar-light | source | Onboarding 3 · Script |
| `OnboardReciter` | onboarding | compact | ar-light | source | Onboarding 4 · Reciter |
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
| `HadithCollChaptersPartial` | hadith | compact | ar-light | source | Partly chaptered book (OpenITI chapters, option B): accepted chapters plus unchaptered runs in place |
| `HadithCollChaptersDark` | hadith | compact | dark | source | Hadith chapters · list · dark |
| `HadithCollChaptersPartialDark` | hadith | compact | dark | source | Partly chaptered book (OpenITI chapters, option B): accepted chapters plus unchaptered runs in place · dark |
| `HadithCollChaptersEnglish` | hadith | compact | en | source | Hadith chapters · list · English |
| `HadithCollChaptersPartialEnglish` | hadith | compact | en | source | Partly chaptered book (OpenITI chapters, option B): accepted chapters plus unchaptered runs in place · English |
| `HadithCollChapterHadith` | hadith | compact | ar-light | source | Hadith chapter · hadith list · Arabic |
| `HadithCollChapterHadithDark` | hadith | compact | dark | source | Hadith chapter · hadith list · dark |
| `HadithCollChapterHadithEnglish` | hadith | compact | en | source | Hadith chapter · hadith list · English |
| `HadithCollReader` | hadith | compact | ar-light | source | Hadith reader · Arabic · hadith text 28/56 pt |
| `HadithCollReaderExplained` | hadith | compact | ar-light | source | Hadith reader · Arabic · explanation card under the hadith (HadeethEnc), top of the page · hadith text 28/56 pt |
| `HadithCollReaderTwoExplanations` | hadith | compact | ar-light | source | Hadith reader · Arabic · two explanation cards stacked (HadeethEnc, then a classical commentary), scrolled to the second card · hadith text 28/56 pt |
| `HadithCollReaderDark` | hadith | compact | dark | source | Hadith reader · dark · hadith text 28/56 pt |
| `HadithCollReaderExplainedDark` | hadith | compact | dark | source | Hadith reader · dark · explanation card under the hadith · hadith text 28/56 pt |
| `HadithCollReaderEnglish` | hadith | compact | en | source | Hadith reader · English · hadith text 28/56 pt |
| `HadithCollReaderExplainedEnglish` | hadith | compact | en | source | Hadith reader · English UI · explanation card (Arabic text, English labels) · hadith text 28/56 pt |
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
| `HadithCollExpandedReader` | hadith | expanded | ar-light | source | Hadith reader · expanded window · 1194 × 834 · tab rail, books pane, side panel · hadith text 28/56 pt |
| `HadithCollExpandedReaderExplained` | hadith | expanded | ar-light | source | Hadith reader · expanded window · explanation cards in the side panel · hadith text 28/56 pt |
| `HadithCollMenu` | hadith | compact | ar-light | awaiting-approval | Menu · ordered by daily use, Qibla and Misbaha cards (ADR 0089, بانتظار الموافقة) |
| `HadithCollMenuDark` | hadith | compact | dark | awaiting-approval | Menu · new cards · Hadith entry · dark (ADR 0089, بانتظار الموافقة) |
| `HadithCollMenuEnglish` | hadith | compact | en | awaiting-approval | Menu · new cards · Hadith entry · English (ADR 0089, بانتظار الموافقة) |
| `HadithCollSources` | hadith | compact | ar-light | source | Settings · المصادر والشكر · Hadith row added |
| `SeerahMapRegion` | seerah | compact | ar-light | awaiting-approval | الخريطة · المنطقة (بانتظار الموافقة) |
| `SeerahMapRegionDark` | seerah | compact | dark | awaiting-approval | الخريطة · المنطقة · داكن (بانتظار الموافقة) |
| `SeerahMapRegionEnglish` | seerah | compact | en | awaiting-approval | Map · region · English UI, map labels stay Arabic (بانتظار الموافقة) |
| `SeerahMapRegionYear` | seerah | compact | ar-light | awaiting-approval | الخريطة · عمر محدد: ٥٣ سنة (الهجرة)، والباقي باهت (بانتظار الموافقة) |
| `SeerahMapMakkah` | seerah | compact | ar-light | awaiting-approval | خريطة مكة · المعالم والأحداث، تجميع وإخفاء أسماء متزاحمة، نافذة حدث (بانتظار الموافقة) |
| `SeerahMapMakkahDark` | seerah | compact | dark | awaiting-approval | خريطة مكة · داكن (بانتظار الموافقة) |
| `SeerahMapMadinah` | seerah | compact | ar-light | awaiting-approval | خريطة المدينة · المعالم والأحداث، موضع تقريبي (بانتظار الموافقة) |
| `SeerahCluster` | seerah | compact | ar-light | awaiting-approval | مجموعة تنفتح على حلقة (٦ أحداث أو أقل) · دار الأرقم (بانتظار الموافقة) |
| `SeerahClusterSheet` | seerah | compact | ar-light | awaiting-approval | أكثر من ٦ أحداث في موضع واحد: ورقة الموضع بترتيب العمر (بانتظار الموافقة) |
| `SeerahEvent` | seerah | compact | ar-light | awaiting-approval | صفحة الحدث · نص الكتاب، العمر (والسنة الهجرية تفصيلًا) والمكان، السابق والتالي، المصدر (بانتظار الموافقة) |
| `SeerahEventDark` | seerah | compact | dark | awaiting-approval | صفحة الحدث · داكن (بانتظار الموافقة) |
| `SeerahEventEnglish` | seerah | compact | en | awaiting-approval | Event page · English UI, the book stays Arabic (بانتظار الموافقة) |
| `SeerahEventOther` | seerah | compact | ar-light | awaiting-approval | صفحة الحدث · المكان «أخرى» والعمر «غير محدد» (بانتظار الموافقة) |
| `SeerahList` | seerah | compact | ar-light | awaiting-approval | «عرض كقائمة» · مجمّعة بالفترة والسنة، و«غير محدد» في آخرها (بانتظار الموافقة) |
| `SeerahListDark` | seerah | compact | dark | awaiting-approval | «عرض كقائمة» · داكن (بانتظار الموافقة) |
| `SeerahListEnglish` | seerah | compact | en | awaiting-approval | List view · English UI (بانتظار الموافقة) |
| `SeerahMapKey` | seerah | compact | ar-light | awaiting-approval | مفتاح الخريطة · الرموز والطرق (بانتظار الموافقة) |
| `SeerahTimeline` | seerah | compact | ar-light | awaiting-approval | الخط الزمني · الحالات: دون اختيار، السحب، سنة مختارة، غير محدد (بانتظار الموافقة) |
| `SeerahStateDownload` | seerah | compact | ar-light | awaiting-approval | السيرة غير منزّلة · الحجم وزر التنزيل (بانتظار الموافقة) |
| `SeerahStateDownloading` | seerah | compact | ar-light | awaiting-approval | جارٍ التنزيل (بانتظار الموافقة) |
| `SeerahStateOffline` | seerah | compact | ar-light | awaiting-approval | دون اتصال ولم تُنزَّل بعد (بانتظار الموافقة) |
| `SeerahStateError` | seerah | compact | ar-light | awaiting-approval | تعذّر فتح البيانات (بانتظار الموافقة) |
| `SeerahStateEmptyYear` | seerah | compact | ar-light | awaiting-approval | سنة بلا أحداث (بانتظار الموافقة) |
| `SeerahExpanded` | seerah | expanded | ar-light | awaiting-approval | نافذة واسعة ١١٩٤ × ٨٣٤ · الخط الزمني عموديًا في البداية، الخريطة، صفحة الحدث في النهاية (بانتظار الموافقة) |
| `SeerahExpandedCity` | seerah | expanded | ar-light | awaiting-approval | نافذة واسعة · خريطة المدينة وسنة مختارة (بانتظار الموافقة) |
| `SeerahMenu` | seerah | compact | ar-light | awaiting-approval | القائمة · بطاقة السيرة النبوية (بانتظار الموافقة) |
| `SeerahSources` | seerah | compact | ar-light | awaiting-approval | الإعدادات · المصادر والشكر · صف السيرة وخريطتها (بانتظار الموافقة) |
