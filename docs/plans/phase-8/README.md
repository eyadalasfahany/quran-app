# Phase 8 step briefs (السيرة النبوية)

Plan: [`../phase-8.md`](../phase-8.md) (read its «Revision» first). Formats, validator and report: [`data-format.md`](data-format.md). Spec edits to apply: [`spec-changes.md`](spec-changes.md). ADR 0089 (Proposed). One brief per step is written when the step starts; none exists yet.

## Rules for every step

- Read `CLAUDE.md`, `.claude/agent-rules.md`, the app CLAUDE.md for the folder you touch, the plan's «Revision» and «Rules».
- **No generated text.** Event titles are the book's headings, copied by `seerah:skeleton`; quotes come from `seerah:quote`; never type Arabic book text. No assignment is invented: when the book does not state the place or the year, use `other` or the year bucket «غير محدد» with the flag.
- **Never run `seerah:approve`, never write `reviews/`.** Everything stays `draft`.
- Fixtures and tests use placeholders; the real book text is only in the pinned source file and generated output.
- Keep correctness code DB-free (this machine has no MySQL; `phpunit.xml` uses MySQL). Do not weaken MySQL collations for SQLite.
- No production release, no deploy, no new native package. Commit only to the work branch.
- Report counts, keys and paths only.

## Order and checkpoints

| Step | Checkpoint report the step writes |
| --- | --- |
| 2 | Version comparison (counts), pin, licence notice |
| 3 | Section list by level, unparsed lines (0), `{…}` run count |
| 6 | Report on fixtures |
| 10 | Gazetteer: places by kind, flagged places |
| 12 to 19 | Per batch: events, events in `other` and in «غير محدد», open flags |
| 21 | `seerah:validate --structure` result; every section covered |
| 27 | Performance numbers (Expo web and device targets where available) |
| 34 | Local verification: lint, tsc, Jest, Expo web screenshots vs `frame-shot.py` |
