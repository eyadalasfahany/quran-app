# 0050 — Moon sighting copy comes from the approved frames

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Supersedes the `TODO-REVIEW` rule in `docs/plans/cursor/11-hijri-and-moon.md` M2 · Spec §12 and §13 do not change

## Context

Phase 6 M2 left the moon sighting copy as `TODO-REVIEW` placeholders in both locales, because the Arabic criterion text was not written by the agent. The developer has now approved the moon frames in `quran-app-screens.html`: `MoonSighting`, `MoonSightingEnglish`, `MoonSightingDark`, `MoonSightingNoLocation`, and the Menu cards `MenuNewCards` and `MenuNewCardsEnglish`. The sighting screen and its components were then brought in line with those frames.

## Decision

1. **Copy from the frames.** Every string the moon screen, its components and the Menu moon card show is the frame's text, in Arabic and English. No placeholder ships. The copy lives in `src/core/i18n/locales/{ar,en}.json` under `moon`.
2. **Zone wording is Odeh (2004).** The criterion is «المعيار: عودة (Odeh) ٢٠٠٤» / "Criterion: Odeh (2004)". The four zone results are the standard Odeh definitions: A visible to the naked eye; B visible with optical aid, may be seen with the naked eye; C visible with optical aid only; D not visible even with optical aid. The zone is named «المنطقة د» / "Zone D", with the letters أ ب ج د / A B C D on the scale.
3. **Digits.** Arabic shows Arabic-Indic digits, and the one-decimal values use the Arabic decimal separator (٫). Times use the 12-hour clock with ص and م in Arabic and AM and PM in English. Dynamic numbers go through `formatNumber`, `formatTime` and `arabizeDigits`.
4. **Layout as drawn.** The Salah location is a pill in the header; tapping it opens Salah. The Hijri evening and the Gregorian day sit at the top of the summary card. The times card has no title. The disclaimer is a tinted box under the estimate card, not inside it. The offline note is centred.
5. **Menu preview.** The Menu card's eyebrow is «الهلال» / "Crescent". The preview is the conjunction relative to now, the nearer of the previous and next one: «الاقتران خلال ٧ ساعات» / "Conjunction in 7 hours", or «الاقتران قبل ٧ ساعات» / "Conjunction 7 hours ago". Without a Salah location the card asks for one.

## Strings the frames do not give

Some strings had no frame text. They are written here so the developer can check them:

- Same-time moonset: «في الوقت نفسه» / "At the same time" (the frames show only the before and after forms).
- No-location English: "Set your location", "We need your location to calculate sunset, moonset and the visibility estimate. We read the location set in Prayer and never change it.", "Open location in Prayer". The frame gives Arabic only.
- Menu no-location fallback: «حدّد موقعك» / "Set your location".
- Plural and unit forms: the Arabic plurals of hours, minutes and days, and the English «h», «min» and «hours».

## Consequences

- Nothing in the moon screens is a placeholder any more. `grep -rn TODO-REVIEW apps/mobile/src` returns nothing.
- Evening facts come from the existing `data/` functions. The conjunction before sunset and the age at sunset are computed in `evening.ts` from `findPreviousConjunction`; no new astronomy is added.
- Known gaps against the frames, which are deliberate for now: the frames use 26 pt and 24 pt serif sizes and a 12 pt offline note, and the type scale has 28 pt, 20 pt and 13 pt. The app keeps the tokens. The zone pill uses a 10% tint of the theme's brand colour, derived in code, because the tokens have no tint.
- ADR numbering: the code cites «ADR 0048» for the Hijri adjustment, but no `0048` file exists in this branch. This ADR takes the next free number, 0049, so the two do not collide.
