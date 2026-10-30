# 0027 — Local-only v1: remove accounts, login, and cloud sync

Date: 2026-10-30 · Status: accepted · Amends spec §10, §11, §15, and ADR 0011

## Context

The v1 delivery plan (spec §15) identified cloud accounts and sync (whole Phase 4) as an optional cut line (~4 weeks saved), noting that a local-only v1 is viable and avoids the Apple Sign-In requirement that accompanies Google Sign-In.

Phase 2 step 3 already established a local-only `user.db` SQLite database with tables for bookmarks, highlights, notes, reading position, and local outbox queues. All personal writes are already offline-first and written directly to disk.

The developer decided (30 Oct 2026) to cut account authentication and login entirely from v1:
- No account login or sign-in screens.
- No remote sync engine or cloud synchronization endpoints.
- All personal reading data (bookmarks, highlights, notes, recent listens, audio downloads, search history, khatma progress) remains strictly local on device.
- Add a full Settings screen with language selection (Arabic / English), reading/audio preferences, reminders, and local data management.

## Decision

1. **No Authentication or Login:**
   - Cut endpoints `POST /auth/email/request`, `POST /auth/email/verify`, `POST /auth/google`, `POST /auth/apple`, and `POST /auth/logout`.
   - Cut Sanctum personal access tokens for devices.
   - Remove screens and frames `SignIn`, `VerifyCode`, `Account`, and `DeleteAccount` from the app.
   - Remove the sign-in promo banners from `MyQuran` and `Settings`.

2. **No Remote User Data Sync:**
   - Cut endpoints `POST /sync/push`, `GET /sync/pull`, `GET /me`, `PATCH /me`, `GET /me/export`, `DELETE /me`, `GET /me/devices`, and `DELETE /me/devices/{id}`.
   - The device does not push outbox rows to the network or pull changes. `user.db` remains strictly local to the device.

3. **Local-Only Personal Data in `user.db`:**
   - Bookmarks, highlights, notes, reading position, khatma plans, and khatma logs continue to be stored in the device SQLite database (`user.db`).
   - The outbox table remains unused or dormant.

4. **Settings Screen:**
   - Dedicated Settings screen accessible from `MyQuran` header and the expanded navigation sidebar.
   - Includes:
     - **Language:** toggle/picker for Arabic (`ar`) and English (`en`), switching app locale and RTL/LTR layout.
     - **Reading Preferences:** Mushaf script font, reading mode, theme/appearance (system/light/dark), auto dark mode after Maghrib, default tafsir.
     - **Listening Preferences:** default reciter, download over Wi-Fi only, storage & downloads link.
     - **Habit & Reminders:** daily reading reminder toggle & time selector (local notifications).
     - **About & Data:** app sources and acknowledgments, and a "Clear all local data" action with confirmation alert to wipe `user.db`.

5. **Phase 4 Rescoped:**
   - Phase 4 becomes **"My Quran, Khatma and Settings (Local-only)"**.

## Consequences

- Saves ~4 weeks of backend and frontend synchronization development, edge-case conflict resolution, and third-party auth setups (Google OAuth, Apple JWKS/ES256 keys).
- The app requires no server-side user data storage or privacy compliance for remote personal data.
- The review against `quran-app-screens.html` verifies `Settings` and `MyQuran` without their `#SignIn` / `#Account` links and banners.
- Direct path to Phase 5 (Beta & Store review) once Settings, My Quran, and Khatma are in place.

