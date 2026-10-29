# 0019 — No default tafsir

Date: 2026-10-29 · Status: accepted · Amends the step 8 default selection (phase 1), so it follows the content plan's rule that no resource is preinstalled

## Context

Phase 1 step 8 added a provisional default: the first `tafsirs` resource in the app locale, falling back to `en`. The first sync therefore downloaded a tafsir the reader never chose. `docs/content-plan.md` says no resource is preinstalled and a tafsir downloads when the reader chooses it.

## Decision

1. The default selection is every `mushafs` resource and the first `chapter_recitations` resource. No tafsir.
2. A tafsir installs only from the reader's choice: the reader-settings tafsir (`tafsirChosen`, `tafsirId`) or the tafsir panel's download list (step 13).
3. Recitations are unchanged until Phase 3 (audio).
4. A tafsir auto-installed before this decision is removed at the next sync. There is no migration. The app is pre-release and only testers have it.

## Consequences

- A new install opens the tafsir panel on its download list (`#TafsirDownload`).
- The first sync downloads less.
- Testers who had an automatic tafsir lose it at their next sync and choose again if they want it.
