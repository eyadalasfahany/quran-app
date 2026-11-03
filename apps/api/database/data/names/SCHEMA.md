# Reviewed Names list JSON (ADR 0043 A2–A3)

Path: `apps/api/database/data/names/<list_slug>.json` (production list: `tirmidhi.json` after step N1).

Record edition and rights in `SOURCE.md` before import. Import runs only when `content_sources` for `names-tirmidhi` is `granted`.

## Top-level object

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schema_version` | integer | yes | Must be `1`. |
| `list_slug` | string | yes | ASCII slug, max 64 chars (e.g. `tirmidhi`). Must match `config('names.list_slug')`. |
| `source_version` | string | yes | Reviewer-defined version string for the pack (e.g. `tirmidhi-2026-11-03`). Bump when Arabic bytes change. |
| `list` | object | yes | One row for `names_lists` (see below). |
| `names` | array | yes | Exactly **99** objects (see below). Order may differ; `position` is authoritative. |

Quran reference rows are **not** in this file. They are added later in `names-quran-map.json` (separate step; deferred).

Optional `notes` array is reserved for licensed `names_notes` rows; ship **empty** or omit in v1.

## `list` object (`names_lists`)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title_ar` | string | yes | Arabic title shown in the app (max 200 chars). |
| `source_label_ar` | string | yes | «القائمة: …» line (max 500 chars). Reviewer-approved wording. |
| `attribution_ar` | string \| null | no | Optional Arabic attribution. |
| `attribution_en` | string \| null | no | Optional English attribution. |
| `edition_reference` | string \| null | no | Edition citation (title, publisher, year, hadith number); mirrors N1 fields. |

## Each element of `names` (`names` table)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `position` | integer | yes | `1` … `99`, unique. |
| `name_slug` | string | yes | Stable ASCII id (`a-z`, `0-9`, hyphens). Unique within the list. Used in favourites (ADR 0043 A6). |
| `name_ar` | string | yes | Source Arabic bytes, stored unchanged (`utf8mb4_0900_bin`). |

The importer derives `text_search` from `name_ar` via `SearchTextNormalizer` (spec §7). Do not put `text_search` in JSON.

## Example shape (placeholders only — not production data)

```json
{
  "schema_version": 1,
  "list_slug": "tirmidhi",
  "source_version": "tirmidhi-YYYY-MM-DD",
  "list": {
    "title_ar": "[عنوان القائمة — نص تجريبي]",
    "source_label_ar": "[القائمة: … — نص تجريبي]",
    "attribution_ar": null,
    "attribution_en": null,
    "edition_reference": null
  },
  "names": [
    {
      "position": 1,
      "name_slug": "example-slug-01",
      "name_ar": "[الاسم] FIXTURE name 1 — not a name"
    }
  ]
}
```

Production file must contain **99** `names` entries transcribed from the edition recorded in `SOURCE.md`.

## Validation rules (import)

- Refused when `content_sources.permission_status` is not `granted`.
- Exactly 99 names; positions `1`–`99` each once; unique `name_slug`.
- `name_ar` must be non-empty UTF-8; no duplicate bytes across rows.
- File SHA-256 is stored in the import fingerprint; unchanged bytes skip a version bump.
