# Step 5 — Phase 4 exit check (reviewer)

On the iPhone 17 simulator, Arabic and English, portrait and landscape:

| # | Check | Expected |
| --- | --- | --- |
| 1 | **Language switch** | Switching between Arabic and English updates UI strings immediately and flips the layout direction (RTL / LTR) cleanly. |
| 2 | **Settings navigation & controls** | All toggles (Auto dark mode, Wi-Fi only, Daily reminder) persist; sub-screen links (Reader settings, Reciters, Downloads, Sources) navigate properly. |
| 3 | **Clear local data** | Tapping "Clear local data" prompts confirmation; on confirm, empties `user.db` tables and resets the UI without crashes. |
| 4 | **My Quran tabs** | Bookmarks, highlights, notes, and Khatma render items with correct metadata. Empty states match `#EmptyMyQuran`. |
| 5 | **Khatma workflow** | Creating a plan, advancing daily reading progress, and viewing progress graphs behaves as specified. |
| 6 | **Offline & persistence** | All user data survives app killed and restarted completely offline; zero network calls for personal data. |
| 7 | **Visual conformance** | Compare screenshots with `#Settings`, `#MyQuran`, `#EmptyMyQuran`, and `#Khatma` in `quran-app-screens.html` (with the approved absence of sign-in cards per ADR 0027). |

Record results in [`../phase-4.md`](../phase-4.md).

