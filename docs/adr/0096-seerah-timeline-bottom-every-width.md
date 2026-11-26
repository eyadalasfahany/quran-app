# 0096 — Seerah timeline at the bottom on every width

Date: 2026-11-26 · Status: **accepted** for points 1–2 (developer, 26 Nov 2026); points 3–5 follow from them, and the medium title pill in point 4 awaits the developer's OK. Amends ADR 0091 and the Phase 8 plan (`docs/plans/phase-8.md`, D3 and the window-class table).

## Context

- On expanded windows the Seerah screen drew the timeline as a 150 pt vertical bar on the start side (frames `SeerahExpanded`, `SeerahExpandedCity`).
- On an iPad in landscape that column was too narrow: the title «كل الأعمار» truncated to «ك…», the event count wrapped over itself, the step arrows sat at the top instead of the bottom, and the stage names were clipped.
- The developer checked it on the iPad and asked for the phone's layout instead: the timeline at the bottom, not on the side.

## Decision

1. The Seerah timeline is the horizontal bar docked at the bottom on every window class: compact, medium and expanded, portrait and landscape, phone landscape included.
2. On a window wider than the phone, the bar, the event callout and the empty-year card share a centred column capped at 720 pt, the same cap as the reading column.
3. The rest of the expanded layout is unchanged. The event still opens in the 440 pt side panel on the end side, and the timeline sits in the map area beside it.
4. On expanded windows the title pill hugs its text and is centred, as frame `SeerahExpanded` draws it. The build also hugs it on medium, which has no frame; that part awaits the developer's OK. Phones still stretch it between the header buttons.
5. The map opens at no less than the scale that covers the window (`coverScale`), so on a wide window no art border or blank page shows at the sides.

## Consequences

- The vertical orientation of `TimelineBar` and its parts is no longer used by any screen.
- Phone landscape shows less map above the bar. The developer accepted this for one layout everywhere.
- Frames `SeerahExpanded` and `SeerahExpandedCity` still draw the vertical bar. They need redrawing with the bottom bar (ADR 0087 flow); until then, this ADR wins over them.

## Amendment, 26 Nov 2026 (developer): the timeline can be hidden

- The timeline hides like the reader's mini player. A drag down on its title row collapses it into a capsule in the bottom trailing corner (left in Arabic); a tap on the capsule, or a drag up, brings it back. The card carries the player's ⌄ hint at its top centre.
- The capsule shows the focus and its event count (for example «كل الأعمار · ٢١١ حدثًا»). It is 32 pt tall in a 44 pt hit area, with the player capsule's glass and placement. The card comes back without a slide; the capsule slides in. The hint adds no top padding. The developer accepted these on 26 Nov 2026.
- The choice is saved under `seerah.timelineCollapsed`. A short window (a landscape phone) starts collapsed, and a tap opens it for that window only, the same rule as the player.
- While it is hidden, the map, the chip stacks, the callout and the empty-year card use the space down to the capsule.
- The developer approved building it with no new frame (exception to the ADR 0087 flow for this change).
