# core

Home, mushaf, ayah sheet, player, reader settings

15 frames · review page: `design/core/<Screen>/index.html` (ADR 0087)

| id | size | theme | status | caption |
|---|---|---|---|---|
| `Main` | compact | ar-light | source | Home |
| `MainLandscapeRail` | compact-short | ar-light | awaiting-approval | الرئيسية · أفقي، الشريط الرأسي ٨٤٤ × ٣٩٠ (بانتظار الموافقة) |
| `Mushaf` | compact | ar-light | source | Mushaf page · Uthmani Hafs (the app draws the ﴿ ﴾ end-of-ayah marks inline, so the recited one turns brand) |
| `MushafZoom150` | compact | ar-light | source | Mushaf page zoom 150% · Hafs, compact, placeholder words (no Quran text). Approved by the developer, 26 Nov 2026 |
| `MushafZoom200` | compact | ar-light | source | Mushaf page zoom 200% · the same page, about 4 to 5 words a line, two ragged lines. Approved by the developer, 26 Nov 2026 |
| `MushafPlaybackRiwayah` | compact | ar-light | awaiting-approval | Mushaf · Hafs pages while a Hafs reciter plays for a reader who chose Warsh (ADR 0090 decision 12, step 9b Q6) (بانتظار الموافقة) |
| `MushafFullscreenEnter` | compact | ar-light | source | Mushaf · full screen button in the tools pill (ADR 0071) |
| `MushafFullscreen` | compact | ar-light | source | Mushaf · full screen: no toolbar, player, status bar or Android navigation bar; the exit button sits where the full screen button was; audio keeps playing (ADR 0071) |
| `AyahSheet` | compact | ar-light | source | Ayah actions · mid detent (50%) |
| `AyahSheetRiwayah` | compact | ar-light | awaiting-approval | Ayah actions · ayah in Warsh (non-Hafs): reference and riwayah in the header, no text card, highlight row, and only حفظ and ملاحظة (ADR 0090, step 9 Part F) (بانتظار الموافقة) |
| `AyahSheetRiwayahUnavailable` | compact | ar-light | source | Ayah actions · ayah in Warsh (non-Hafs) until its ayah map and marks exist: reference and riwayah in the header, one note, no tabs or actions (play, tafsir and marks would land on the Hafs ayah with the same number). Approved by the developer, 26 Nov 2026 |
| `Player` | compact | ar-light | source | Player |
| `PlayerReciters` | compact | ar-light | source | Player, no artwork (ADR 0062 option b). Reciter name, surah, ayah card, progress, transport and the utility bar (repeat, ayah range, sleep timer; speed removed). Reciters list always visible under the controls: current reciter selected (checkmark); installed row is a button that switches reciter; not-downloaded row has a 44 pt download button; a reciter without the current surah (37) is disabled with «غير متوفرة لهذه السورة». Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `PlayerReciterDownloading` | compact | ar-light | source | Player, no artwork. After tapping download on «محمود خليل الحصري»: that row shows the progress bar (player colours) and a 44 pt stop button. Caption annotation: «يبدأ التشغيل تلقائيًا عند انتهاء التنزيل» (when the download finishes, the player switches to that reciter and auto-plays from the current ayah). Switching reciter keeps the place: same surah, start of the current ayah, new reciter timings, play or pause state and repeat kept; no timings («بدون تتبع») starts the surah from the beginning (ADR 0062 decision 6). Approved 4 Nov 2026 (ADR 0062) |
| `ReaderSettings` | compact | ar-light | source | Reader settings · mid detent (50%) · al-Duri hidden (ADR 0090 item 12). Approved by the developer, 26 Nov 2026 |

## Model rule
Read this file only. Open `frames/core/<id>.html` only for visual/HTML review of one frame.
