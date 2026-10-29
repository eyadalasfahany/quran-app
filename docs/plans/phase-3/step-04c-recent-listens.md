# Step 4c — Recently played («آخر ما استمعت إليه»)

**Approved by the developer (29 Oct 2026).**

Follow [README.md](README.md). Needs steps 2b and 3a. **Touches the `user.db` schema, so the developer approves this plan before code** (root CLAUDE.md, "Plan before coding anything that touches the schema").

## Frame
`#Main` draws «آخر ما استمعت إليه» on Home: a 17/600 muted heading, then one row per recent recitation. A row is the reciter's tile (48, radius 14, `fillSecondary`, Amiri initial in `brand`), the reciter (17/600), «سورة الكهف · مرتّل» (13, muted), and a 44 pt play button. The most recent row's button is filled `brand`; the others are outlined `surfaceRaised`. Two rows are drawn. `#ExpandedHome` draws the same section in the content column.

## Data (spec §6, already specified)
- **`user.db` table `recent_listens`**, local only. It is personal listening history, not on the spec's synced list, so it gets no outbox rows and no sync columns.
  - Columns: `audio_file_id` (QF's id, stable across content re-syncs), `reciter_resource_id`, `chapter_id`, `last_position_ms`, `played_at` (ms).
  - PK `audio_file_id`, so playing a surah again updates its row.
  - `reciter_resource_id` and `chapter_id` are added to the spec's columns so Home can draw a row without `content.db` lookups that fail when a pack is gone.
- **Migration:** user.db `0001_recent_listens`, generated with `npm run db:generate:user`. It adds a table only and never touches existing rows.
- **Pruning:** keep the 20 most recent rows (the same cap as search history), pruned on write.

## Writes (engine, `player.ts`)
An upsert on pause, on a track change (for the surah that ended), on stop, and every 15 s while playing, matching spec §12 and the step 4 brief. It goes through a small repository, `src/features/audio/data/recent-listens.ts`, on the user DB executor, with its tests.

## Home
- **Hook:** `useRecentListens(limit = 2)`, a Drizzle `useLiveQuery`, so Home updates as you listen.
- **Component:** `RecentListenRow` in `src/features/home/components/`, with its test, following the frame. Pressing play resumes that surah at `last_position_ms` with that reciter: `setReciterId`, then `playChapter(chapterId, lastPositionMs)`. If the reciter's pack is gone, it installs it first, like the Listen tab.
- **Empty:** with no history, the section is hidden. The frame draws no empty state, and Home leaves out what it has no data for (ADR 0017).
- **Spec and docs:** §6's `recent_listens` row gains the two columns, with a one-line note in the step 4 brief.

## Tests
- The migration adds the table and keeps existing data.
- Repository upsert, prune at 20, and order.
- Engine writes on pause, track change and the 15 s tick (fake timers).
- Row render, the first-row filled play button, press resumes at the position, ar and en, a11y, no hex.
- Home hides the section when the table is empty.
