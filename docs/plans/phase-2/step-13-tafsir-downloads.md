# Step 13 — Download tafsirs from the tafsir panel

Follow [README.md](README.md). Needs step 12 (names on the device). Touches sync and adds UI, so the plan and the new frame are approved before code.

**Goal (developer, 28 Oct 2026):** when no tafsir is on the phone, the tafsir panel lists the Arabic tafsirs the API offers, each with a download button, instead of a bare empty state. The rows look like the Downloads screen's (`#Downloads` frame).

## Design (frame first)
- New frame `#TafsirDownload` in `quran-app-screens.html`, beside `#Tafsir`: the same sheet header («التفسير», «البقرة · الآية ٢»), a short line («نزّل تفسيرًا لقراءته بدون إنترنت»), then a card of rows built from the `#Downloads` rows: title (`name_ar`), subtitle (author · size), trailing pill «تنزيل»; a downloading row shows the stop button and the progress bar; an installed row shows «عرض». Same tokens as `#Downloads`. Tablet panel variant follows the side-panel layout.
- **Approved** by the developer (28 Oct 2026), with two decisions: a downloading row's subtitle shows both the status and the details («جارٍ التنزيل · ابن كثير · ٤٫٨ م.ب»); a finished download switches its row to «عرض» and waits for a tap — the panel does not jump to the tafsir.

## Chips list every tafsir (developer, 28 Oct 2026)
The chip row lists every Arabic tafsir in the device catalogue, installed or not, as the `#Tafsir` frame draws («التفسير الميسر», «ابن كثير», «السعدي»). Selecting an installed chip shows its passage; selecting one that isn't installed shows that tafsir's `DownloadRow` in place of the passage («تنزيل» → progress → «عرض»; «عرض» shows the passage). Reading a tafsir online before download is out of scope: the API serves whole packs only.

## Data
- **Catalogue on the device:** `content.db` migration 0004 (shared with step 12) adds `catalog_resources` (`resource_id`, `group`, `name`, `name_ar`, `author_name`, `language_code`, `direction`, `version`, `pack_size_bytes`), rewritten from every manifest the sync reads. It's derived data, safe to rebuild. With the API's Arabic-only filter (ADR 0015) it holds only Arabic tafsirs.
- **Per-resource download:** `core/sync` gets `installResource(resourceId, onProgress, signal)` that reuses the pack download, checksum and import path, reports progress and can be cancelled. When no tafsir was chosen yet, the reader settings' tafsir choice becomes the first one downloaded, but the panel stays on the list until «عرض» is tapped.
- **Offline:** with no catalogue yet and no network, the panel keeps today's empty state with a retry.

## Components
- `DownloadRow` in `src/shared/ui/` (title, subtitle, state `available | downloading | installed`, progress, actions), reused later by the Downloads screen.
- `TafsirDownloadList` in `src/features/reader/panels/`.
- Each with its colocated test (render, every state, press, RTL ar/en, a11y: button labels, progress value).

## Tests
Catalogue rewrite from a manifest; install progress and cancel; checksum failure leaves nothing installed; panel shows the list when nothing is installed and the passage after a download.
