# duas

Duas + my duas

40 frames · review page: `design/duas/<Screen>/index.html` (ADR 0087)

| id | size | theme | status | caption |
|---|---|---|---|---|
| `DuasHome` | compact | ar-light | awaiting-approval | الأدعية · on the Azkar home layout (ADR 0092 decision 5): Azkar header, «أدعيتي» card, «التصنيفات» in the Azkar section title and Azkar topic tiles (body 600 name, caption count, 16 pt padding, 88 pt min height, 12 pt gap); first eight categories, «عرض الكل» expands in place; single-name topics from config/azkar_topics.php; no sources card, no Hisn source tiles; counts are mock (بانتظار الموافقة) |
| `DuasHomeDark` | compact | dark | awaiting-approval | الأدعية · Dark, same layout as DuasHome (بانتظار الموافقة) |
| `DuasHomeEnglish` | compact | en | awaiting-approval | Duas home · English (LTR), same layout as DuasHome (بانتظار الموافقة) |
| `DuasHomeCategories` | compact | ar-light | awaiting-approval | الأدعية · «عرض الكل» expanded in place: every category in the Azkar topic tiles, «عرض أقل» collapses; counts are mock (بانتظار الموافقة) |
| `DuasLoading` | compact | ar-light | awaiting-approval | الأدعية · loading: skeleton of the header, «أدعيتي» card and tiles (from AzkarLoading) (بانتظار الموافقة) |
| `DuasUnavailable` | compact | ar-light | awaiting-approval | الأدعية · unavailable (direct route, from AzkarUnavailable) (بانتظار الموافقة) |
| `DuasHomeCategoriesExpanded` | expanded | ar-light | awaiting-approval | الأدعية · expanded · 1194 × 834: tab rail with القائمة current, the phone layout in the 640 pt content column (بانتظار الموافقة) |
| `DuasCategory` | compact | ar-light | source | الأدعية · one category (الموت والمتوفى): the Azkar category card, number and dua text only, no sources (developer 15 Nov 2026); a Hisn row opens the Azkar reader (ADR 0091 D5) (approved 15 Nov 2026) |
| `DuasCategoryDark` | compact | dark | awaiting-approval | الأدعية · one category · Dark (DuasCategory layout, topic «الجنائز») (بانتظار الموافقة) |
| `DuasCategoryEnglish` | compact | en | awaiting-approval | Duas · one category · English (LTR) (DuasCategory layout, topic Funerals) (بانتظار الموافقة) |
| `DuasCategoryQuran` | compact | ar-light | awaiting-approval | الأدعية · «من القرآن الكريم»: Azkar item cards with the ring badge, the ayah in the Quran face and its surah · ayah line under it (as AzkarCategoryQuranRef) (بانتظار الموافقة) |
| `DuasSearch` | compact | ar-light | source | الأدعية · search: categories first, then duas with their category; mirrors AzkarSearch (ADR 0091) (approved 15 Nov 2026) |
| `DuasSearchEmpty` | compact | ar-light | awaiting-approval | الأدعية · search, empty query: recent searches and the hint (from AzkarSearchEmpty; no scope chips in Duas) (بانتظار الموافقة) |
| `DuasSearchNoResults` | compact | ar-light | awaiting-approval | الأدعية · search, no results: «لا توجد نتائج مطابقة» (بانتظار الموافقة) |
| `DuasFavorites` | compact | ar-light | awaiting-approval | الأدعية · المفضلة: Azkar favourite cards with the ring badge and the category under the text (from AzkarFavorites) (بانتظار الموافقة) |
| `DuasFavoritesEmpty` | compact | ar-light | awaiting-approval | الأدعية · المفضلة · empty (from AzkarFavoritesEmpty) (بانتظار الموافقة) |
| `DuaQuranDetailNoSource` | compact | ar-light | source | دعاء قرآني · without «المصدر والتفاصيل»; the surah and ayah stay (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaQuranDetail` | compact | ar-light | awaiting-approval | دعاء قرآني · Arabic, rebased on DuaQuranDetailNoSource (surah · ayah line only) (بانتظار الموافقة) |
| `DuaQuranDetailDark` | compact | dark | awaiting-approval | دعاء قرآني · Dark, rebased on DuaQuranDetailNoSource (بانتظار الموافقة) |
| `DuaQuranDetailEnglish` | compact | en | awaiting-approval | Quranic dua · English (LTR), rebased on DuaQuranDetailNoSource (بانتظار الموافقة) |
| `DuaQuranDetailAudio` | compact | ar-light | awaiting-approval | دعاء قرآني · play button «تشغيل» in the action row beside Aa, share and save (ADR 0092 decision 3); «فتح في المصحف» stays in the pager row (بانتظار الموافقة) |
| `DuaQuranDetailPlaying` | compact | ar-light | awaiting-approval | دعاء قرآني · playing with the Quran player: the current ayah in the reader highlight (highlight-active, brand edge), «إيقاف» in the action row, the reader player bar above the actions (بانتظار الموافقة) |
| `DuaHadithDetailNoSource` | compact | ar-light | source | دعاء نبوي · without sources: no takhrij line, no links, no المرجع or الدرجة, no credit lines (developer 15 Nov) (approved 15 Nov 2026) |
| `DuaHadithDetail` | compact | ar-light | awaiting-approval | دعاء نبوي · Arabic, rebased on DuaHadithDetailNoSource; no play button (no licensed recording) (بانتظار الموافقة) |
| `DuaHadithDetailDark` | compact | dark | awaiting-approval | دعاء نبوي · Dark, rebased on DuaHadithDetailNoSource (بانتظار الموافقة) |
| `DuaHadithDetailEnglish` | compact | en | awaiting-approval | Prophetic dua · English (LTR), rebased on DuaHadithDetailNoSource (بانتظار الموافقة) |
| `DuaHisnDetail` | compact | ar-light | awaiting-approval | دعاء من حصن المسلم · text only: Azkar reader top bar, the dua text, save / share / Aa, previous and next chips; no counter, no source line (بانتظار الموافقة) |
| `DuaHisnDetailDark` | compact | dark | awaiting-approval | دعاء من حصن المسلم · Dark (بانتظار الموافقة) |
| `DuaHisnDetailEnglish` | compact | en | awaiting-approval | Hisn al-Muslim dua · English (LTR); the dua text stays Arabic (بانتظار الموافقة) |
| `DuaHisnDetailAudio` | compact | ar-light | awaiting-approval | دعاء من حصن المسلم · with its recording (ADR 0092 decision 3): play and download in the action row (from AzkarReaderAudio), no counter ring (بانتظار الموافقة) |
| `DuaHisnDetailAudioPlaying` | compact | ar-light | awaiting-approval | دعاء من حصن المسلم · playing: pause in the action row and the Azkar player bar (AzkarPlayerBar) above it; the bar opens AzkarPlayer (بانتظار الموافقة) |
| `DuaHisnDetailAudioOffline` | compact | ar-light | awaiting-approval | دعاء من حصن المسلم · offline, not downloaded: «غير متاح دون اتصال» pill, no play control (بانتظار الموافقة) |
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
