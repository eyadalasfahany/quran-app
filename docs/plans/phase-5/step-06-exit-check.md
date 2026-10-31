# Step 6 — Phase 5 Exit Check

Phase-5 exit criteria (`docs/plans/phase-5.md`). Frames: `#Salah`, `#SalahDark`, `#Qibla`, updated `#ExpandedHome`/`#ExpandedHomeDark`.

## Goal
Prove the phase's exit criteria on simulators and a real device before Phase 5 is called done.

## Checklist
1. **Offline pass (airplane mode):** times compute, countdown ticks, qibla rotates, scheduled notifications still fire (advance device clock on a debug build or wait for a boundary), Hijri falls back to the cached-date increment and disappears when > 30 days stale.
2. **Visual review:** iPhone 17 simulator screenshots (`xcrun simctl io booted screenshot`) vs `frame-shot.py` renders at 390 × 844 for `#Salah`, `#SalahDark`, `#Qibla`; iPad screenshot vs the updated sidebar frame. Any mismatch fails unless recorded as an approved deviation in the brief.
3. **Languages:** full pass in Arabic (RTL) and English (LTR); tab-bar mirroring after locale switch; digits convention (Arabic-Indic in ar).
4. **Windows:** compact, medium, expanded; resize keeps the الصلاة tab active; qibla centered column on expanded.
5. **Notifications on a real device:** permission flow, per-prayer toggles, reschedule on timezone change (toggle sim timezone), deep link to الصلاة.
6. **Quality gates:** `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor` in `apps/mobile`; dependency audits clean (`node .github/scripts/npm-audit.mjs`).
7. **Docs:** update the current-phase pointer in `AGENTS.md` / `CLAUDE.md`; close any spec §16 questions this phase resolved.

## Deliverables
- Signed-off checklist in this brief (date, builds used, deviations list).
