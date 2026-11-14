# Phase 8 — spec and CLAUDE.md changes the plan implies (listed, not applied)

Apply when ADR 0089 is accepted (RB-S9). `docs/technical-spec.md` is not edited by the plan.

| Spec § | Change |
| --- | --- |
| §1 decisions | One line: Seerah, one book, map and timeline, reviewed data (ADR 0089). |
| §4 app structure | Routes `app/seerah/index.tsx`, `app/seerah/event/[id].tsx`; feature folder `src/features/seerah/{data,logic,components}`; window-class layouts (compact, medium, expanded, short). |
| §5 resources and tables | Add `seerah` to the `resources.group` list; new tables `seerah_books`, `seerah_sections`, `seerah_paragraphs`, `seerah_places`, `seerah_events`, `seerah_event_places`, `seerah_routes`, `seerah_route_stops`, `seerah_milestones`, `seerah_map_levels`, `seerah_map_layers`, `seerah_map_positions`, `seerah_map_route_paths` (plan «Data model»); Arabic text columns `utf8mb4_0900_bin`; `content_sources` row `openiti` (shared with ADR 0076; created once). |
| §6 device schema | Same tables in `content.db`; no `user.db` change in v1. |
| §7 pack contents and import | Add `seerah:{slug}` to the pack list; a paragraph: Seerah is not synced from QF; `seerah:import` reads the committed, SHA-pinned data folder; validation modes `--structure` and `--release`; production import requires `--release`; no QF data involved. |
| §9 endpoints | `GET /seerah/books` (catalogue). |
| §12 | A short «Seerah map» subsection: two map levels, native pins over a transformed SVG, label and cluster rules, list alternative. |
| §14 | CI job for `apps/api/database/data/seerah/**`; the validator rules; the DB-free test layer; one Maestro flow. |
| §15, §16 | Phase 8 row and cut lines; risks R1 to R11. |
| `CLAUDE.md` | «Current phase» text; the ADR 0087 waiver for Phase 8; a line under Non-negotiable 6 that curated place and year assignments are flagged data («أخرى» and «غير محدد» buckets), not generated text. |
| `.claude/agent-rules.md` | Seerah bullets: no typed Arabic quotes, never approve, never write `reviews/`. |
| `docs/content-plan.md` | Entry already added (proposed). |
