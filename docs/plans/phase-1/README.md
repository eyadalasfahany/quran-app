# Phase 1 — implementation briefs

One file per step of [`../phase-1.md`](../phase-1.md). Each brief is written so a coding agent (Cursor, Claude Code, Codex) can implement the step from the repo alone, with no chat history.

## How to use

1. Open a fresh agent chat at the repo root.
2. Send: **"Implement `docs/plans/phase-1/step-NN-….md`. Follow `docs/plans/phase-1/README.md`."**
3. The agent implements, runs the gates, and ends with the report below. It does **not** commit.
4. The reviewer reruns the gates, reads the diff against the brief, and the developer commits.
5. One step per chat, in order. A step may rely only on what earlier steps actually committed. If something it needs is missing, the agent stops and says so.

| Step | Brief | Needs |
| --- | --- | --- |
| 1 | [step-01-qf-client.md](step-01-qf-client.md) | — |
| 2 | [step-02-mirror-schema.md](step-02-mirror-schema.md) | 1 |
| 3 | [step-03-sync-engine-translations.md](step-03-sync-engine-translations.md) | 1, 2 |
| 4 | [step-04-tafsirs-mushafs-recitations.md](step-04-tafsirs-mushafs-recitations.md) | 3 |
| 5 | [step-05-text-integrity-tanzil.md](step-05-text-integrity-tanzil.md) | — (independent) |
| 6 | [step-06-packs-manifest-changes.md](step-06-packs-manifest-changes.md) | 3, 4 |
| 7 | [step-07-device-database.md](step-07-device-database.md) | 5 |
| 8 | [step-08-device-content-sync.md](step-08-device-content-sync.md) | 6, 7 |
| 9 | [step-09-quran-core.md](step-09-quran-core.md) | **Superseded** by step 11: Tanzil supplies verse and word text (ADR 0010) |
| 11 | [step-11-word-map-and-basmala.md](step-11-word-map-and-basmala.md) | 5, 7 (can run alongside 8) |
| 10 | [step-10-exit-check.md](step-10-exit-check.md) | 8, 11 |

## Shared contract: pack tables and change-feed entities

Steps 3, 4, 6, 7 and 8 must agree on these. The API writes `content_changes` rows (steps 3–4), packs contain the tables (step 6), and the device stores the same tables and applies changes (steps 7–8). Column names are identical everywhere. A `content_changes.payload` is the full row in these columns.

| Group | Pack and device tables (columns) | Change `entity` | `entity_key` |
| --- | --- | --- | --- |
| `translations` | `translation_entries` (`resource_id`, `verse_id`, `text`, `footnotes` JSON text or null) | `translation_entry` | `verse_id` |
| `tafsirs` | `tafsir_entries` (`resource_id`, `group_tafsir_id`, `first_verse_id`, `last_verse_id`, `html`) | `tafsir_entry` | `group_tafsir_id` |
| `mushafs` | `mushafs` (`id`, `resource_id`, `name`, `pages_count`, `lines_per_page`, `default_font_name`); `mushaf_pages` (`mushaf_id`, `page_number`, `first_verse_id`, `last_verse_id`, `first_word_id`, `last_word_id`, `verse_mapping` JSON text); `word_layouts` (`mushaf_id`, `word_id`, `verse_id`, `position_in_verse`, `char_type`, `glyph`, `page`, `line`, `position_in_line`) | `mushaf`, `mushaf_page`, `word_layout` | `id`; `page_number`; `word_id` |
| `chapter_recitations` | `recitations` (`id`, `resource_id`, `reciter_name`, `reciter_name_ar`, `style`, `qirat`, `has_word_segments`); `chapter_audio_files` (`id`, `recitation_id`, `chapter_id`, `audio_url`, `size_bytes`, `duration_ms`, `format`); `recitation_timings` (`audio_file_id`, `verse_id`, `start_ms`, `end_ms`, `segments` JSON text) | `recitation`, `chapter_audio_file`, `recitation_timing` | `id`; `id`; `"{audio_file_id}:{verse_id}"` |

- **`op`:** `upsert` (the payload is the full row) or `delete` (the payload is null; `entity_key` identifies the row within the resource).
- **Snapshot replacements** (`RESOURCE_CREATE`, `RESOURCE_INVALIDATE`, `RESOURCE_DELETE`) write **no** change rows. They raise the resource's `changes_floor_version`, so older devices get `410` and download the pack.

## Rules for every step

**Read before coding:**
- `AGENTS.md` (repo root).
- The app's own file:
  - `apps/api/CLAUDE.md` for API steps.
  - `apps/mobile/CLAUDE.md` for app steps.
- The brief, and every document it names.

Where the brief and the spec disagree, **stop and report**; don't pick one.

**Secrets and network:**
- Never open, print or copy any real `.env` file. `.cursorignore` hides them; don't work around it with shell commands either.
- No live calls to Quran Foundation or any other external host. API tests use `Http::fake()` with `Http::preventStrayRequests()`.
- Live checks against QF prelive are run by the reviewer, never by the agent.

**Quran text is never altered** (non-negotiable #1):
- **Byte for byte:** QF and Tanzil text (verse text, translations, tafsir words, mushaf glyph codes) is stored and moved exactly as received. Don't trim, normalize, re-encode, or "fix" whitespace or Unicode.
- **One derived column:** only `text_search` is normalized.
- **Test it:** every step that moves text includes a byte-exact round-trip test.

**API code** (`apps/api`):
- **Typing:** `declare(strict_types=1)`, full typing, Larastan level 8 with no new ignores or baseline entries.
- **Layering** (enforced by `tests/Unit/ArchitectureTest.php`):
  - Controller → FormRequest → Data object → Service → Repository contract → Eloquent repository → Model.
  - Responses are API Resources (ADR 0006).
  - Transactions live in services, never in repositories.
- **Integrations:** `app/Integrations/*` never import `App\Domains`.
- **Config:** config files read env through `App\Support\Env`.
- **Errors:** named exceptions, never bare `\Exception`.
- **Text columns:** Quran and QF text columns use collation `utf8mb4_0900_bin`.
- **Enumerated columns:** `varchar` plus a PHP backed enum cast on the model, never MySQL `ENUM` (ADR 0009).
- **Formatting:** run `vendor/bin/pint` before finishing.

**App code** (`apps/mobile`):
- **Packages:** add Expo-managed packages with `npx expo install`. Any other new package must already be in the `docs/content-plan.md` version table, or the brief must say to add it there.
- **Types:** API types come from `@quran/api-contract`; never hand-write an API payload type.
- **Strings:** no hard-coded UI strings (i18n files only).
- **UI components (rule):** see `apps/mobile/CLAUDE.md`, "Components and screens":
  - Every component is its own file, with its own colocated test.
  - Screens only compose components.
  - All UI follows the `apple-design` skill (`.agents/skills/apple-design/SKILL.md`).
  - Phase 1 adds no UI. If a step needs any, this rule applies.

**Dependencies:** add only what the brief names. No other packages.

**Gates.** Run every gate that applies and make it green; fix failures rather than just reporting them:

| Touched | Gates |
| --- | --- |
| `apps/api` | `cd apps/api && vendor/bin/pint && composer qa` |
| `apps/mobile` | `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor` |
| `packages/*` | `npm run typecheck` and the package's `npm test -w <package>` |
| An API endpoint | `npm run generate -w @quran/api-contract`, then the mobile `tsc` |
| Dependencies | `node .github/scripts/npm-audit.mjs` and/or `cd apps/api && composer audit` |

Finish with `git status --short` from the repo root and confirm only the files the brief expects changed.

**Git:** never `git add`, `git commit`, `git stash` or `git checkout` other files. Leave everything uncommitted.

**Report.** End with exactly:
1. What changed and why, one short paragraph per area.
2. Files touched (full list).
3. Gate outcomes with counts: Pint, PHPStan errors, Pest passed/failed, Jest passed/failed, lint, `tsc`.
4. Deviations from the brief, open questions, and decisions you made that the brief didn't dictate.
