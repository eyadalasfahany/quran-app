# duas

Duas + my duas

46 frames · review page: `design/duas/<Screen>/index.html` (ADR 0087)

| id | size | theme | status | caption |
|---|---|---|---|---|
| `DuasHome` | compact | ar-light | source | الأدعية · on the Azkar home layout (ADR 0092 decision 5): Azkar header, «أدعيتي» card, «التصنيفات» in the Azkar section title and Azkar tiles (body 600 name, caption count, 16 pt padding, 88 pt min height, 12 pt gap). Order: «من القرآن الكريم», the five hadith dua books (collection names from config/hadith_titles.php), the HadeethEnc groups (titles as received), then the single-name topics (config/azkar_topics.php); first eight shown, «عرض الكل» expands in place; no sources card, no credit line; counts are mock (approved 15 Nov 2026) |
| `DuasHomeDark` | compact | dark | source | الأدعية · Dark, same layout as DuasHome (approved 15 Nov 2026) |
| `DuasHomeEnglish` | compact | en | source | Duas home · English (LTR), same layout as DuasHome (approved 15 Nov 2026) |
| `DuasHomeCategories` | compact | ar-light | source | الأدعية · «عرض الكل» expanded in place: every category in the Azkar tiles (Quran, hadith books, HadeethEnc groups, topics), «عرض أقل» collapses; counts are mock (approved 15 Nov 2026) |
| `DuasLoading` | compact | ar-light | source | الأدعية · loading: skeleton of the header, «أدعيتي» card and tiles (from AzkarLoading) (approved 15 Nov 2026) |
| `DuasUnavailable` | compact | ar-light | source | الأدعية · unavailable (direct route, from AzkarUnavailable) (approved 15 Nov 2026) |
| `DuasHomeCategoriesExpanded` | expanded | ar-light | source | الأدعية · expanded · 1194 × 834: tab rail with القائمة current, the phone layout in the 640 pt content column (approved 15 Nov 2026) |
| `DuasCategory` | compact | ar-light | source | الأدعية · one category («الجنائز»): the Azkar category card, number and dua text only, no sources; a Hisn row opens DuaHisnDetail (approved 15 Nov 2026) |
| `DuasCategoryDark` | compact | dark | source | الأدعية · one category · Dark (DuasCategory layout, topic «الجنائز») (approved 15 Nov 2026) |
| `DuasCategoryEnglish` | compact | en | source | Duas · one category · English (LTR) (DuasCategory layout, topic Funerals) (approved 15 Nov 2026) |
| `DuasCategoryQuran` | compact | ar-light | source | الأدعية · «من القرآن الكريم»: Azkar item cards with the ring badge, the ayah in the Quran face and its surah · ayah line under it (as AzkarCategoryQuranRef) (approved 15 Nov 2026) |
| `DuasSearch` | compact | ar-light | source | الأدعية · search: categories first, then duas with their category; mirrors AzkarSearch (ADR 0091) (approved 15 Nov 2026) |
| `DuasSearchEmpty` | compact | ar-light | source | الأدعية · search, empty query: recent searches and the hint (from AzkarSearchEmpty; no scope chips in Duas) (approved 15 Nov 2026) |
| `DuasSearchNoResults` | compact | ar-light | source | الأدعية · search, no results: «لا توجد نتائج مطابقة» (approved 15 Nov 2026) |
| `DuasFavorites` | compact | ar-light | source | الأدعية · المفضلة: Azkar favourite cards with the ring badge and the category under the text (from AzkarFavorites) (approved 15 Nov 2026) |
| `DuasFavoritesEmpty` | compact | ar-light | source | الأدعية · المفضلة · empty (from AzkarFavoritesEmpty) (approved 15 Nov 2026) |
| `DuaQuranDetailNoSource` | compact | ar-light | source | دعاء قرآني · without «المصدر والتفاصيل»; the surah and ayah stay (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaQuranDetail` | compact | ar-light | source | دعاء قرآني · Arabic, rebased on DuaQuranDetailNoSource (surah · ayah line only) (approved 15 Nov 2026) |
| `DuaQuranDetailDark` | compact | dark | source | دعاء قرآني · Dark, rebased on DuaQuranDetailNoSource (approved 15 Nov 2026) |
| `DuaQuranDetailEnglish` | compact | en | source | Quranic dua · English (LTR), rebased on DuaQuranDetailNoSource (approved 15 Nov 2026) |
| `DuaQuranDetailAudio` | compact | ar-light | source | دعاء قرآني · play button «تشغيل» in the action row beside Aa, share and save (ADR 0092 decision 3); «فتح في المصحف» stays in the pager row (approved 15 Nov 2026) |
| `DuaQuranDetailPlaying` | compact | ar-light | source | دعاء قرآني · playing with the Quran player: the current ayah in a plain highlight-active background wash (the app draws it on React Native nested Text, which cannot draw the reader’s rounded box or inset bar), «إيقاف» in the action row, the reader player bar above the actions; both pause controls kept (developer) (approved 15 Nov 2026) |
| `DuaQuranDetailStarting` | compact | ar-light | awaiting-approval | دعاء قرآني · starting: the play control shows the shared BufferingRing around the pause glyph (busy), as the reader’s play button does while audio loads (بانتظار الموافقة) |
| `DuaQuranDetailStartingDark` | compact | dark | awaiting-approval | دعاء قرآني · starting · Dark (بانتظار الموافقة) |
| `DuaQuranDetailStartingEnglish` | compact | en | awaiting-approval | Quranic dua · starting · English (LTR) (بانتظار الموافقة) |
| `DuaQuranDetailNoTimings` | compact | ar-light | awaiting-approval | دعاء قرآني · reciter without ayah timings: «تشغيل» at the disabled opacity (0.45) and the PlayerErrorNotice under the action row (duas.quranPlay.noTimings), in page colours (بانتظار الموافقة) |
| `DuaQuranDetailNoTimingsDark` | compact | dark | awaiting-approval | دعاء قرآني · no timings · Dark (بانتظار الموافقة) |
| `DuaQuranDetailNoTimingsEnglish` | compact | en | awaiting-approval | Quranic dua · no timings · English (LTR) (بانتظار الموافقة) |
| `DuaHadithDetailNoSource` | compact | ar-light | source | دعاء نبوي · without sources: no takhrij line, no links, no المرجع or الدرجة, no credit lines (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaHadithDetail` | compact | ar-light | source | دعاء نبوي · Arabic, rebased on DuaHadithDetailNoSource; no play button (no licensed recording) (approved 15 Nov 2026) |
| `DuaHadithDetailDark` | compact | dark | source | دعاء نبوي · Dark, rebased on DuaHadithDetailNoSource (approved 15 Nov 2026) |
| `DuaHadithDetailEnglish` | compact | en | source | Prophetic dua · English (LTR), rebased on DuaHadithDetailNoSource (approved 15 Nov 2026) |
| `DuaHisnDetail` | compact | ar-light | source | دعاء من حصن المسلم · text only: Azkar reader top bar, the dua text, save / share / Aa, previous and next chips; no counter, no source line (approved 15 Nov 2026) |
| `DuaHisnDetailDark` | compact | dark | source | دعاء من حصن المسلم · Dark (approved 15 Nov 2026) |
| `DuaHisnDetailEnglish` | compact | en | source | Hisn al-Muslim dua · English (LTR); the dua text stays Arabic (approved 15 Nov 2026) |
| `DuaHisnDetailAudio` | compact | ar-light | source | دعاء من حصن المسلم · with its recording (ADR 0092 decision 3): play and download in the action row (from AzkarReaderAudio), no counter ring (approved 15 Nov 2026) |
| `DuaHisnDetailAudioPlaying` | compact | ar-light | source | دعاء من حصن المسلم · playing: pause in the action row and the Azkar player bar (AzkarPlayerBar) above it, both kept (developer); the bar opens AzkarPlayer (approved 15 Nov 2026) |
| `DuaHisnDetailAudioOffline` | compact | ar-light | source | دعاء من حصن المسلم · offline, not downloaded: «غير متاح دون اتصال» pill, no play control (approved 15 Nov 2026) |
| `MyDuas` | compact | ar-light | source | أدعيتي · Arabic |
| `MyDuasDark` | compact | dark | source | أدعيتي · Dark |
| `MyDuasEnglish` | compact | en | source | My duas · English (LTR) |
| `MyDuaEditor` | compact | ar-light | source | تحرير الدعاء · Arabic |
| `MyDuaEditorDark` | compact | dark | source | تحرير الدعاء · Dark |
| `MyDuaEditorEnglish` | compact | en | source | My dua editor · English (LTR) |
| `MyDuasEmpty` | compact | ar-light | source | أدعيتي · فارغة |
| `MyDuasEmptyEnglish` | compact | en | source | My duas · empty · English (LTR) |

## Model rule
Read this file only. Open `frames/duas/<id>.html` only for visual/HTML review of one frame.
