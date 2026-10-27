# Step 7 — Ayah actions, tafsir and translation panels (App)

Follow [README.md](README.md). Needs steps 1, 3 and 6 committed. Read also:
- The `Ayah actions` and `Tafsir` phone frames, and the `#tablet-reader` panel frames, in `quran-app-screens.html`.
- Spec §12.
- `docs/content-plan.md`, tafsir rendering.
- The step 3 hooks.

**Goal:** the three panel contents, each one component usable both in the expanded `SidePanel` and inside the compact or medium sheets.

## Components (`src/features/reader/panels/`, each with its own test)

| Component | Content |
| --- | --- |
| `PanelHeader` | «الفاتحة · الآية ٢» plus a page and juz caption, and close |
| `AyahActionsPanel` | **Word meanings:** `WordMeaningChip`s from step 2's `getWords` (Uthmani) and the word-by-word translation, when that resource is installed; otherwise the chips are hidden. **Highlight:** a row of 4 `HighlightSwatch`es, which calls `setHighlight` (step 3), with selecting the current colour again clearing it. **Actions grid:** `ActionTile`s for Play from here (primary; disabled until Phase 3 behind the `audio` flag, with an accessibility hint), Bookmark (`toggleBookmark`, the icon state from `useBookmarks`), Repeat (Phase 3, disabled), Note (opens `NoteEditor`), Copy and Share |
| `NoteEditor` | Multiline input, 10,000-character limit with a counter, save and delete through step 3. Arabic and English text fields follow the user's input direction |
| `TafsirPanel` | **Picker:** a radio group of `Chip`s for installed tafsirs, with the name and its length tag when known. **Ayah card:** the Uthmani text with its marker. **Body:** the tafsir HTML **as received** (already sanitized server-side), rendered with `@native-html/render` (version-table pin 1.0.4) in the interface font at the reader's font scale. **Source caption:** author and "via Quran Foundation". **Coverage:** "covers ayahs 3–5" when the entry spans a range. **Navigation:** previous and next ayah. **Not installed:** an empty state with a "download this tafsir" action that adds the resource to the step 8 selection (Phase 1 content sync) |
| `TranslationPanel` | The selected translations for the ayah, each with its name, direction from the resource, and a source caption. A toggle to show them inline in Reading mode (saved with the reader settings) |

**Copy and Share:**
- **Copy** puts the Uthmani text **exactly as stored**, plus «﴿٢﴾» and the reference line (surah name and ayah), on the clipboard. Add `expo-clipboard` through `npx expo install` and to the version table.
- **Share** uses the native share sheet with the same text.
- Never alter the ayah text.

## Tests

- **Each component** (README checklist).
- **Actions:**
  - A bookmark toggles through the step 3 repository (real `node:sqlite` `user.db`).
  - Choosing a highlight colour sets it, and choosing it again clears it.
  - The note limit is enforced.
  - Copy produces the exact text bytes.
  - The play and repeat tiles are disabled while the audio flag is off.
- **Tafsir:**
  - The range caption.
  - Previous and next change the verse.
  - The empty state when not installed.
  - The HTML rendered without altering text (the text content equals the input's text content).
- **Translation:** direction per resource.

## Leave untouched

The repositories, the reader lists, the shell layout and the tokens.
