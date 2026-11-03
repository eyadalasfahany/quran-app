# Content you must do (Names + Duas)

Agents implement code, packs, and screens. **Religious content and review are yours.** No AI transcription or generated duas (non‑negotiables 1 and 6).

Branch: stay on your current feature branch — no new branches.

---

## A. 99 Names — what “N1” means (only this)

**N1 is not an API bug.** The app must not invent or download the 99 Arabic names (non‑negotiable 6 + ADR 0043). N1 = you (or a reviewer) write down where the list came from and type the 99 names once.

Fill the blanks in `apps/api/database/data/names/SOURCE.md`:

| You write | Example shape (not a real edition choice) |
| --- | --- |
| Edition title | The printed book / edition name you own |
| Publisher | Publisher on that book |
| Year | Year on that book |
| Hadith number | Number of the 99-names narration in that edition |
| Transcriber / reviewer | Your name / reviewer name |
| Arabic source label | Short line shown under the list (reviewer wording) |

Then put the 99 strings in `apps/api/database/data/names/<list>.json` (N2 schema). **Never** paste AlAdhan or random GitHub JSON as the stored source.

**Quran ayah links under each name:** optional later. Skip if you do not want Quran-side work now.

**Audio:** none in v1 (ADR 0055).

Until SOURCE + JSON exist and a reviewed migration sets the source to `granted`, Menu → Names stays hidden (pack locked). Code for Names API/UI can still land; it just has no real list yet.

---

## B. Duas — Quranic (blocks production Quranic list)

1. Open `apps/api/config/duas_quran_map.php` (80 `candidate` rows after `php artisan duas:quran-candidates`).
2. For each key `quran:SURAH:AYAH`, open that ayah in the Mushaf and decide:
   - `reviewed` — ship as a Quranic dua (set `verse_to` if it is a multi-ayah span)
   - `rejected` — do not ship
   - leave `candidate` — local/dev only; **production ignores these**
3. Optionally add `added` rows by hand for missed duas (e.g. 1:6–7), with your evidence note on the review sheet.
4. Keep the review sheet at `docs/plans/duas/quran-duas-review.md` (created with the code tasks).

Regenerate anytime: `php artisan duas:quran-candidates` — your `reviewed` / `rejected` / `added` rows are kept.

---

## C. Duas — Prophetic (HadeethEnc)

1. After `duas:snapshot hadeethenc` runs on a machine with network, confirm the pin in `config/duas.php`.
2. Review Hisn links and collection refs when those commands exist (`candidate` → `reviewed`).
3. Written confirmation from HadeethEnc remains **non-blocking** (already accepted risk).

---

## D. Duas — already usable without new content

| Part | Your work |
| --- | --- |
| حصن المسلم | None — uses Azkar pack + audio already |
| أدعيتي | None — user-typed; no audio |
| Hadith books of dua | Needs Phase 7 packs (separate; not on this tree yet) |

---

## E. Quick commands (API)

```powershell
cd d:\projects\quran-app\apps\api
php artisan duas:quran-candidates
# later:
# php artisan duas:snapshot hadeethenc
# php artisan duas:import
```

Mobile: install the `duas` / `names` packs when the pack builder ships; Menu cards appear only when packs are installed.
