# Step 3 — Local user data: bookmarks, highlights, notes (App)

Follow [README.md](README.md). Independent of the other steps. Read also:
- Spec §6 (`user.db`) and spec §11 (sync model).
- [ADR 0011](../../adr/0011-phase-2-fonts-and-local-user-data.md), D2.
- Non-negotiable #4: every personal write goes to `user.db` plus the outbox first, and the network is never on the path of a tap.

**Goal:**
- A local-only `user.db` with bookmarks, highlights, notes and the outbox.
- Repositories the ayah panel (step 7) calls.
- **No network.** Phase 4 adds the sender, the pull and account sync on this exact schema.

## Schema (`src/core/db/user/schema.ts`, Drizzle, own migrations folder)

Tables from spec §6:
- `bookmarks`, `highlights`, `notes`, each with:
  - `id` (uuid text PK), `verse_id` int.
  - The table's own columns: `kind` / `page`; `color`; `body`, max 10,000 characters.
  - `client_updated_at` int (ms), `deleted_at` int null, `dirty` int (0/1).
- `outbox`: `seq` integer PK autoincrement, `entity`, `entity_id`, `op` (`upsert` | `delete`), `payload` TEXT JSON, `client_updated_at`, `attempts`.
  - **One pending row per (`entity`, `entity_id`):** a newer edit replaces the older one.
- `sync_meta` (`key`, `value`).

Indexes:
- (`verse_id`) on each entity table.
- A partial unique index for one live highlight per verse, and one live verse bookmark per verse (`WHERE deleted_at IS NULL`).

Then:
- `open.ts` opens `user.db` (WAL) with migrations, next to `content.db`.
- `user.db` is **never** touched by content updates.

## Repositories (`src/features/library/data/`)

| Function | Behaviour |
| --- | --- |
| `toggleBookmark(verseId)` | Creates, or soft-deletes, the live verse bookmark |
| `setHighlight(verseId, color \| null)` | Upserts, or soft-deletes with null |
| `saveNote(verseId, body)` / `deleteNote(id)` | Body trimmed of **UI whitespace only**, never ayah text. Max 10,000 characters, else a validation error |
| `listBookmarks()`, `getHighlights(verseIds)`, `getNotes(verseId)` | Live rows only |

**Writes:**
- Each write runs in **one transaction**: write the row with `dirty = 1` and `client_updated_at = now`, then upsert the outbox row with the full payload (or the delete).
- UUIDs come from `expo-crypto` `randomUUID()` (already added in Phase 1 step 8).

**Read hooks:** reactive hooks (`useBookmarks`, `useHighlights(verseIds)`, `useNotes(verseId)`) with Drizzle's `useLiveQuery` for the UI.

## Tests

`node:sqlite`.
- Each repository function.
- **The outbox:** coalescing (two edits give one outbox row with the latest payload), and delete after upsert.
- **Unique constraints:** a second live highlight on the same verse replaces the first.
- The 10,000-character limit.
- **Atomicity:** a thrown error inside the transaction leaves neither row.
- `user.db` and `content.db` are separate files (deleting `content.db` keeps bookmarks).

## Leave untouched

`content.db`, the sync code, and the UI (step 7 uses these hooks).
