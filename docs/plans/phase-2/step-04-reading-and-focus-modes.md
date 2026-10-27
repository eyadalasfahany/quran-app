# Step 4 — Reading and Focus modes (App)

**Status: done** (27 Oct 2026). In the working tree, not committed. Do not reimplement. Mode switch and resize scroll to the top visible ayah. Selection is a callback; step 6 creates `selection.ts`.

Follow [README.md](README.md), including the **shared reader contract**. Needs steps 1 and 2 committed. Read also:
- Spec §12 (reader, motion).
- The `Reading mode` and `Focus mode` phone frames, and `#tablet-reader` → "Reader · expanded · reading mode", in `quran-app-screens.html`.
- The `apple-design` skill (README).

**Goal:** two of the three reader modes. Each is a vertical FlashList of ayahs (6,236 items) that keeps position.

## Components (`src/features/reader/components/`, each with its own test)

| Component | Content |
| --- | --- |
| `BismillahLine` | `chapters.bismillah_text` in Amiri Quran, centred, **byte for byte**. Shown before ayah 1 of surahs 2–114 except 9 |
| `SurahHeader` | `SurahCartouche` + surah name + revelation place + ayah count (i18n, Arabic-Indic digits) |
| `ReadingAyahRow` | Uthmani `text_uthmani` in Amiri Quran at `fontScale × base`, with an end `AyahMarker`. Under it, one block per selected translation (translation text **as received**, its direction from `resources.direction`, and a source caption). States: selected or recited (the neutral `highlightActive` wash plus a filled brand `AyahMarker`, ADR 0012, never gold), and user highlight colour (from step 3 when present). Tapping the marker opens ayah actions. `onPress` selects, `onLongPress` opens actions |
| `FocusAyah` | One ayah per screen-height block, larger type, no translations, a minimal chrome-free layout (the Focus frame) |

**Rules:**
- **Quran text is never truncated** (`numberOfLines` is never set on Quran text).
- **Accessibility label:** the Imla'i text plus «الآية {n}» (Arabic) or "Ayah {n}" (English).

## The list (`src/features/reader/ReadingList.tsx`)

- **FlashList** (version-table pin 2.3.2) of rows: a `SurahHeader` and `BismillahLine` before each surah's first ayah, then the ayahs.
- **Data:** in windows, through the step 2 repositories (load about 200 ayahs around the anchor, and extend on scroll). Never all 6,236 at once.
- **Measured heights:** cached per (window width, font scale, translation set). A fold, unfold, rotation or translation change clears the cache, and `useReadingAnchor` restores the top visible ayah (spec §4).
- **Column:** centred, capped at `READING_COLUMN_MAX` (720).
- **Switching** between Reading and Focus keeps the anchor ayah (cross-fade `standard`, a fade under Reduce Motion, as in the spec §12 motion table).

## Tests

- Each component (README checklist), plus:
  - The Basmala shown for 2:1 and not for 9:1 or 1:1.
  - Byte-exact rendering of 2:255's text.
- **The list:**
  - Renders around the anchor `18:10`.
  - Scrolling extends the window.
  - Changing the window width (mock `useWindowDimensions`) restores the same top ayah.
  - Switching mode keeps the anchor.
  - The selection callback receives the verse key.

## Leave untouched

The repositories (step 2), Mushaf mode (step 5), the routes and panels (steps 6–7), and the tokens.
