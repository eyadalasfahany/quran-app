# 0049 — The qibla face and Kaaba marker stay fixed; only the needle moves

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Supersedes the rotating-face part of ADR 0030 (its amendment "the dial turns with the phone", 1 Nov 2026) and the live-dial line of the #Qibla note in spec §12. The frame caption and spec line are updated with this ADR (see Consequences).

## Context

ADR 0030's amendment (1 Nov 2026) turned the whole qibla face by −heading, so ش pointed to true north and the Kaaba marker to Makkah on screen. The lubber mark at the top then showed the phone's facing direction, and the needle lined up with the marker.

The developer asked (2 Nov 2026) that the compass stay put on screen. The face (bezel, ticks, cardinals, numerals) should not spin under the reader's eye. The Kaaba marker should sit fixed at the top under the lubber mark (ش), not orbit with the qibla angle. The reader turns the phone until the needle meets the Kaaba at the top.

## Decision

1. **The face never turns.** The bezel, ornament, tick rings, cardinals (ش ج غ ق) and degree numerals stay in their frame positions on screen, whatever the heading.
2. **The Kaaba marker is fixed at the top.** It sits on the r=130 orbit under the lubber mark at angle 0. It does not rotate with the compass.
3. **One qibla angle moves the needle only.** While the compass is live (a heading is available and Reduce Motion is off), the angle is `bearing − heading`, on the shortest turn (the needle rule of ADR 0030's amendment, kept). The needle turns by that angle about the dial centre.
4. **Facing the qibla.** When the phone faces the qibla, the angle is 0: the needle points up to the fixed Kaaba marker under the lubber mark.
5. **No gold arc.** The thin gold stroke from the top to the qibla on the r=130 orbit is removed from the instrument.
6. **Not live.** With no compass, with Reduce Motion or on unsupported hardware, the angle is the bearing. The needle rests at the bearing on the north-up dial; the Kaaba marker stays at the top.
7. **One source for the needle.** QiblaCompass computes the angle once (useFollowTarget) and passes the SharedValue to the needle only. The face takes a constant clearance angle (0) for label fade under the fixed marker and does not re-render with the heading.

## Why

- The developer asked for a fixed compass with the Kaaba at the top. A rotating face moved every label under the reader's eye; an orbiting marker duplicated what the needle already shows.
- The reader's question is "where is the qibla from where I am pointing". The needle answers it; the Kaaba at the top is the target to align with.

## Consequences

- **The cardinals and numerals are a fixed reference ring, no longer geographic, while live.** ش stays at the top of the screen whatever the phone faces. It does not point to true north while the compass is live. The needle shows the direction to Makkah relative to the top of the screen. At rest (not live) the dial is north-up as before, so ش is north again.
- The a11y label keeps the bearing in degrees ("qibla direction: N degrees").
- The aligned halo, the lubber mark, the hub and the dial's scaling (ADR 0036) are unchanged.
- Code: `useDialTurn` and `QiblaUpright` are removed. `QiblaDial` is the static face. `QiblaKaabaMarker` is fixed at the top. `QiblaArc` is removed. `QiblaNeedle` takes the shared angle.
- Spec §12 (the qibla compass line) and the #Qibla frame in `quran-app-screens.html` are updated: no gold arc, Kaaba at the top. ADR 0030's amendment is superseded. ADR 0036 is not affected.
- Not yet verified on a device. The iPhone 17 simulator check and a live heading on hardware are still to do.
