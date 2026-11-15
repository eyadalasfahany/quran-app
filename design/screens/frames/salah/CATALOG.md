# salah

Prayer times + qibla

16 frames · review page: `design/salah/<Screen>/index.html` (ADR 0087)

| id | size | theme | status | caption |
|---|---|---|---|---|
| `Salah` | compact | ar-light | awaiting-approval | الصلاة · زر رجوع وسطر التاريخ تحت العنوان (ADR 0081, 0089، بانتظار الموافقة) |
| `SalahAdhanSoundEntry` | compact | dark | source | الصلاة · صوت الأذان (الرأس — انظر #Salah / #SalahDark؛ ADR 0057) |
| `SalahDark` | compact | dark | awaiting-approval | الصلاة · Dark (ADR 0089, بانتظار الموافقة) |
| `Qibla` | compact | ar-light | source | اتجاه القبلة · القرص ثابت والإبرة تتبع القبلة (ADR 0049) |
| `QiblaLandscape` | compact-short | ar-light | awaiting-approval | اتجاه القبلة · أفقي، ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `RecitersRiwayahRow` | compact | ar-light | awaiting-approval | Listen › Reciters · each row names its riwayah on the second line (ADR 0090 decision 12, step 9b Part C, option a) (بانتظار الموافقة) |
| `RecitersRiwayahHeader` | compact | ar-light | awaiting-approval | Listen › Reciters · one muted line above the list, rows unchanged (ADR 0090 decision 12, step 9b Part C, option b) (بانتظار الموافقة) |
| `ReciterSurahsUnavailable` | compact | ar-light | source | Listen › إسلام صبحي · surah list, rows 35–41 (same row styling as SurahIndex; header as Reciters). Surahs 37 الصافات, 39 الزمر and 40 غافر are missing from this reciter: dimmed (ink-muted), trailing label «غير متوفرة» instead of the play or download control, not tappable (no link, aria-disabled). Others are normal. Approved 4 Nov 2026 (ADR 0062) |
| `SettingsSuggestCard` | compact | ar-light | source | الإعدادات · اقترح فكرة (ADR 0066) |
| `SuggestSheet` | compact | ar-light | source | اقترح فكرة · sheet |
| `SuggestSheetError` | compact | ar-light | source | اقترح فكرة · خطأ في البريد |
| `SuggestSheetSending` | compact | ar-light | source | اقترح فكرة · جارٍ الإرسال |
| `SuggestSheetSent` | compact | ar-light | source | اقترح فكرة · تم الإرسال |
| `SuggestSheetOffline` | compact | ar-light | source | اقترح فكرة · بدون اتصال |
| `SuggestSheetDark` | compact | dark | source | اقترح فكرة · Dark |
| `SuggestSheetEnglish` | compact | en | source | Suggest an idea · English (LTR) |

## Model rule
Read this file only. Open `frames/salah/<id>.html` only for visual/HTML review of one frame.
