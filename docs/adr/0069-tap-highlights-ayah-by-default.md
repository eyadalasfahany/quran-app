# 0069 — Tapping an ayah highlights it by default

Date: 2026-11-06 · Status: superseded by ADR 0072 (developer, 6 Nov 2026) · Amends spec §12 (Tapping an ayah) and ADR 0037 (answer 3 and the "no highlight" part of decision 4). The rest of ADR 0037 is unchanged.

## Context

ADR 0037 made a tap on an ayah open its options and nothing else. The developer now wants a tapped ayah to be highlighted by default, and removed from the same sheet that already manages highlights (6 Nov 2026).

## Decision

1. **A tap saves a gold highlight when the ayah has none.** Tapping an ayah in Mushaf, Reading or Focus, including its options control, writes a normal user highlight to `user.db` + outbox before the options open (sheet, or docked panel on a wide window). Gold is the default because it is the first colour in the row.
2. **An existing highlight is kept.** An ayah that already has a colour keeps it.
3. **Removing stays in the options.** The highlight row works as before: tapping the selected colour removes the highlight, and tapping another colour changes it. Removing does not close the options and does not re-add the highlight while they stay open.
4. **Only a tap on an ayah does this.** The toolbar's ayah actions button, the panel's previous and next, the Reading tafsir shortcut and any other route to the options add no highlight.
5. **The rest of ADR 0037 holds.** A tap still does not pin the view, write the reading anchor or the last-read place, or change what plays.

## Consequences

- The highlight is real user data: it stays after the options close and appears in My Quran's highlights tab.
- A later tap on an ayah whose highlight was removed highlights it again, because a removed highlight is not remembered as a preference.
- A failed write never blocks the tap; the options still open.
