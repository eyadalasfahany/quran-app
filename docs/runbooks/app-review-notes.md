# App Review notes — Taybah 1.0 (Guideline 2.1 information request)

Apple asked for six items on the first submission (2 Nov 2026). Part A goes, as is, into **App Store Connect → App Review Information → Notes** (limit 4,000 characters; Part A is about 3,200). Part B is the shot list for the screen recording. Part C lists what to attach and what to check before resubmitting.

Facts checked on 2 Nov 2026: the production manifest serves 20 recitations, 9 Arabic tafsirs and 1 mushaf. Azkar (OpenDua, Hisn al-Muslim) is written into Part A and must be live in production before you resubmit (the flag is on, but the pack isn't served yet). Hadith is not in this version; if it goes live, add fawazahmed0/hadith-api to items 4 and 6.

---

## Part A — paste into Notes

```
1. SCREEN RECORDING
Physical iPhone, latest iOS, starting at app launch: [LINK or "see attachment"]
Taybah has no accounts or login (so no account deletion flow), no user-generated content shared with others, and no paid content or In-App Purchases, so none of these appear.

2. PURPOSE AND AUDIENCE
Taybah (طيبة) is a free, Arabic-first Quran app for Muslims who read, listen to and study the Quran daily. In one place, with no ads, tracking or sign-up: the Madani mushaf, 9 classical Arabic tafsirs, 17 reciters with the recited word highlighted, prayer times, Qibla, Azkar (daily supplications from Hisn al-Muslim) and a tasbeeh counter. Reading works offline. Bookmarks, highlights, notes and reading plans stay on the device. Arabic and English interface, full right-to-left support.

3. HOW TO USE THE APP
No login or credentials needed; everything works right after install.
- First launch: pick a language, mushaf script and reciter. The app opens on Home.
- Mushaf tab: swipe pages. Tap an ayah for tafsir, bookmark, highlight, note, copy or play. Search is on Home.
- Tafsir: download any of the 9 tafsirs from an ayah's tafsir view.
- Listen tab: pick a reciter and surah. Audio continues in the background and on the lock screen; surahs can be downloaded.
- Prayer tab: prayer times and Qibla compass. Allow location, or pick a city manually.
- Azkar: Home tile or Menu. Read, count repetitions, save favourites.
- Sibha, Khatma and Daily goals: Home and Menu.
- Settings: language, appearance, reading and audio options, local reminders, Sources, and "Clear local data" (deletes all personal data on the device).
Internet is needed only to download content and stream audio; the bundled Quran text opens offline.

4. EXTERNAL SERVICES
- Taybah API (our server, on Railway): Quran content packs (text, mushaf layout, tafsir, recitation timings). No personal data is sent.
- Quran Foundation Content API: licensed source of Quran text, tafsir and recitations; called only by our server with our credentials.
- Quran Foundation audio CDN: recitation audio (streamed or downloaded).
- Quran Foundation font CDN (verses.quran.foundation): mushaf page fonts.
- OpenDua (opendua.org): Azkar text source, imported by our server into our packs.
- Expo EAS Update: JavaScript bug-fix updates.
- On device only: Core Location, compass, local notifications; prayer times computed with the open-source adhan library (MIT).
No authentication, payment, analytics, advertising or AI services. The app generates no religious content.

5. REGIONAL DIFFERENCES
None. Same features and content in every region. The language (Arabic or English) is chosen at first launch, pre-selected from the device language, and can be changed in Settings. Prayer times use the Umm al-Qura method everywhere.

6. THIRD-PARTY MATERIAL AND AUTHORIZATION
- Quran text, mushaf layout, tafsir, recitations: Quran Foundation, under its Developer Terms with production API credentials issued to us (approval attached). Shown unmodified and credited in Settings > Sources.
- Bundled fallback Quran text: Tanzil (tanzil.net), CC BY 3.0, verbatim, credited with a link.
- Mushaf page fonts: King Fahd Glorious Quran Printing Complex, served by Quran Foundation under its font terms, credited.
- Azkar: OpenDua dataset (Hisn al-Muslim by Sa'id al-Qahtani), CC BY 4.0, its attribution shown verbatim in Settings > Sources. OpenDua claims no ownership of the religious text.
- Every tafsir and recitation shows its author or reciter.
- Interface fonts Amiri and IBM Plex Sans Arabic: SIL Open Font License.
The app is free and never resells or exposes this content.
```

---

## Part B — screen recording shot list (iPhone, latest iOS)

**Before recording**

- Update the iPhone to the latest iOS release.
- Delete Taybah, then install the build under review from TestFlight, so onboarding and the permission prompts appear.
- Use Wi-Fi, so downloads are quick on camera.
- Turn on Do Not Disturb, so no personal notifications show.
- Add Screen Recording to Control Center. Turn the microphone off unless you narrate.
- Keep the video under about 3 minutes.

**Shots, in order**

1. Start recording on the iOS Home Screen. Tap the Taybah icon to launch the app. Apple requires the video to start here.
2. Onboarding: choose a language, a mushaf script and a reciter. Land on Home.
3. Home: scroll once to show continue reading, the next prayer, the tiles and daily progress.
4. Mushaf: open a surah from the index and swipe two pages. Tap an ayah to show the ayah options. Add a bookmark.
5. Tafsir: open the ayah's tafsir. Download one tafsir and show its text.
6. Search: search for one word and open a result.
7. Listen: pick a reciter and play a surah, showing the recited word highlighted. Lock the phone to show lock-screen playback. Unlock and pause.
8. Download one surah for offline listening.
9. Salah: allow location at the prompt. Show the prayer times, then the Qibla compass, turning the phone so the needle moves.
10. Azkar: open Morning Azkar, tap to count one dhikr, add a favourite. Then Sibha: tap the counter a few times. Show Khatma or Daily goals.
11. Settings: switch the language to English to show the interface flip to left-to-right, then switch back. Open Sources and acknowledgments. Show "Clear local data" without confirming it.
12. Stop recording.

**Delivering it**

- Easiest: App Store Connect → App Review Information → **Attachment**. Upload the .mp4 (and the QF approval file).
- If the file is too large, upload it to iCloud Drive or Google Drive as "anyone with the link can view", and put the link in item 1 of Part A.

---

## Part C — before resubmitting

- [ ] Attach the Quran Foundation approval (email or Developer Console screenshot showing production access) in App Review Information → Attachment.
- [ ] Replace `[LINK or "see attachment"]` in Part A.
- [ ] Make sure Settings → Sources lists what item 6 claims (Quran Foundation, Tanzil with a link, King Fahd Complex, OpenDua with its attribution). The current build lists only "Quran fonts provided by Quran Foundation". The fuller list needs a new build, or an EAS Update before review starts.
- [ ] iPad: `supportsTablet` is true, so App Review may test on an iPad. Run the TestFlight build on an iPad (or the iPad simulator at least) before resubmitting.
- [ ] Screenshots (Guideline 2.3.3) show the app in use, not only the splash or onboarding.
- [x] Azkar is live in production (manifest lists the `azkar` pack, resource 31 v1, 2 Nov 2026). Confirm it appears in the TestFlight build before recording.
- [ ] Add an Azkar shot to the recording (Part B, step 10).
- [ ] If Hadith goes live before review, add fawazahmed0/hadith-api to items 4 and 6 and to the Sources screen.
