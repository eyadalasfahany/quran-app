# 0059 — The tabs mini player shows only while audio plays or loads; the reader bar keeps its idle rule

Date: 2026-11-04 · Status: **accepted** (developer decision, 4 Nov 2026) · Branch: `main` · Amends ADR 0046 §2 and §3 and ADR 0051 (tabs bar visibility) · Rests on ADR 0024 (reader mini bar), ADR 0046 decision 4 (loading counts as playing)

## Context

ADR 0046 §2 made the mini player show the current ayah whenever nothing plays. §3 then showed the tabs and sidebar bars while idle once an ayah was saved and a reciter resolved. So the tab bar slot carried a bar in almost every state. The developer wants less chrome outside the reader: the tabs bar is noise when the reader is not listening.

The reader keeps its own bar (ADR 0024), which holds the reading place and its play button, so it stays as it is.

## Decision

1. **The tabs bar shows only while audio plays or loads.** `useMiniPlayerVisible('tabs')` is true when the player status is `loading` or `playing`. Loading counts as playing, so the buffering ring shows on every play (ADR 0046 decision 4). Paused, idle and error hide the tabs bar on every window class, phones and expanded windows alike.
2. **Paused hides the tabs bar.** The tab bar slot is empty while paused. A reader who wants to resume opens the reader, or uses the lock screen or Control Center.
3. **The reader bar is unchanged.** `useMiniPlayerVisible('reader')` still shows when a surah is loaded (paused and error included) or, while idle, when a reciter resolves. It stays off the expanded window (ADR 0051).
4. **Insets follow the same rule.** The tab content bottom clearance (`useTabContentBottom`) and the Salah screen's clearance both read `useMiniPlayerVisible('tabs')`, so they shrink when the bar hides. The reader's footprint (`useReaderMiniFootprint`) reads the reader rule and is unchanged.
5. **Outside the reader, the lock screen and Control Center are the controls while paused.** No other paused control is added.

## Consequences

- **Positive:** the tab bar carries no bar while nothing is playing. Content reaches the bottom edge when the bar is hidden.
- **Negative:** from a tab, a paused surah has no on-screen resume. It is one tap into the reader, or the lock screen. The current ayah still feeds the Home card, the Index row and Khatma (ADR 0046 decision 1); only the tabs bar stops showing it.
- **Code:** `useHasCurrentAyah` had no other caller and is removed. The `MiniPlayer` component keeps its idle caption branch, which the reader variant still uses.

## Alternatives considered

- **Keep the idle tabs bar (ADR 0046 §3).** Rejected by the developer: it adds chrome to every tab.
- **Show the tabs bar while paused, as a resume control.** Rejected: paused is the state the developer asked to hide.

## Decisions that need the developer

None.
