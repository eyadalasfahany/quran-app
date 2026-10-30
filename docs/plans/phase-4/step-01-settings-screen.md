# Step 1 — Settings Screen

Spec §15 & ADR 0027. Frame `#Settings` in `quran-app-screens.html`.

## Goal
Build the full Settings screen (`SettingsScreen` at `app/settings/index.tsx` or `app/settings.tsx`), accessible from `MyQuran` header (gear button) and the expanded nav sidebar.

## Scope
1. **Header & Navigation:**
   - Title «الإعدادات» with back button to previous screen.
2. **General / Language Section:**
   - Language selector: Arabic («العربية») and English («English»).
   - Changing language updates app locale via `i18n` and updates RTL/LTR layout direction.
3. **Reading Section («القراءة»):**
   - Quran font: link/selector for Mushaf font.
   - Reading mode and appearance: link/sheet to reader settings (`#ReaderSettings`).
   - Auto dark mode after Maghrib toggle (persists in MMKV / reader settings).
   - Default tafsir: link to tafsir picker sheet/modal.
4. **Listening Section («الاستماع»):**
   - Default reciter: displays current reciter name with link to `Reciters` screen (`/listen/reciters` or sheet).
   - Download over Wi-Fi only toggle (wired to `downloadWifiOnly` setting).
   - Downloads & storage row: displays used storage with link to `Downloads` screen.
5. **Habit & Reminders Section («الورد والتذكير»):**
   - Daily reading reminder toggle (prepares for Step 4).
   - Khatma row: shows active Khatma summary with link to Khatma screen.
6. **About & Local Data Section («عن التطبيق»):**
   - Sources and acknowledgments: links to `/settings/sources`.
   - Clear local data («مسح البيانات المحلية»): red text row. Tapping triggers a confirmation alert ("Are you sure you want to clear your local bookmarks, highlights, notes and Khatma?"). On confirmation, wipes `user.db` tables and resets state.
7. **No Account / Sign-in Elements:**
   - Omit the `#SignIn` card from `#Settings` per ADR 0027.

## Deliverables
- Reusable UI rows and sections in `apps/mobile/src/features/settings/components/`.
- Screen at `apps/mobile/src/features/settings/screens/SettingsScreen.tsx` and route `apps/mobile/app/settings/index.tsx`.
- Colocated unit tests for each new component.
- i18n keys in `ar.json` and `en.json`.

