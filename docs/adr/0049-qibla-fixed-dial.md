# 0049 — The qibla face stays fixed; only the Kaaba marker moves

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Supersedes the rotating-face part of ADR 0030 (its amendment "the dial turns with the phone", 1 Nov 2026) and the live-dial line of the #Qibla note in spec §12. The frame caption awaits the developer's approval and the spec line is updated with it (see Consequences).

## Context

ADR 0030's amendment (1 Nov 2026) turned the whole qibla face by −heading, so ش pointed to true north and the Kaaba marker to Makkah on screen. The lubber mark at the top then showed the phone's facing direction, and the needle lined up with the marker.

The developer asked (2 Nov 2026) that the compass stay put on screen and that only the Kaaba move. The face (bezel, ticks, cardinals, numerals) should not spin under the reader's eye. What the reader needs is where the qibla is relative to where the phone points.

## Decision

1. **The face never turns.** The bezel, ornament, tick rings, cardinals (ش ج غ ق) and degree numerals stay in their frame positions on screen, whatever the heading.
2. **One qibla angle moves.** While the compass is live (a heading is available and Reduce Motion is off), the angle is `bearing − heading`, on the shortest turn (the needle rule of ADR 0030's amendment, kept). The Kaaba marker (with its 64 px halo), the gold arc and the needle all turn by that angle about the dial centre.
3. **Facing the qibla.** When the phone faces the qibla, the angle is 0: the Kaaba marker sits at the top under the fixed lubber mark, and the needle points up with it.
4. **The gold arc** runs from the top (0°) to the angle, the signed way: clockwise when the angle is positive, counter-clockwise when negative. Its stroke is unchanged (goldOnBrandSurface, 3 px, round cap).
5. **Not live.** With no compass, with Reduce Motion or on unsupported hardware, the angle is the bearing. The marker, the arc and the needle rest at the bearing on the north-up dial, exactly as the static instrument drew them before.
6. **One source.** QiblaCompass computes the angle once (useFollowTarget) and passes the same SharedValue to the marker, the arc and the needle, so the three cannot drift apart. The face takes no angle and does not re-render with the heading.

## Why

- The developer asked for a fixed compass with only the Kaaba moving. The rotating face moved every label under the reader's eye.
- The reader's question is "where is the qibla from where I am pointing", and the angle answers it directly. The marker, the arc and the needle show that one relationship in three forms.

## Consequences

- **The cardinals and numerals are a fixed reference ring, no longer geographic, while live.** ش stays at the top of the screen whatever the phone faces. It does not point to true north while the compass is live. The marker and the arc carry the direction to Makkah relative to the top of the screen. At rest (not live) the dial is north-up as before, so ش is north again.
- The a11y label keeps the bearing in degrees ("qibla direction: N degrees").
- The aligned halo, the lubber mark, the hub and the dial's scaling (ADR 0036) are unchanged.
- Code: `useDialTurn` and `QiblaUpright` are removed. `QiblaDial` is the static face. `QiblaKaabaMarker` and `QiblaArc` are new, and `QiblaNeedle` takes the shared angle.
- Documents still showing the rotating face are not changed by this ADR and follow in a separate change: spec §12 (the qibla compass line), the #Qibla caption in `quran-app-screens.html` (awaiting approval per ADR 0030), and ADR 0030's amendment, which this ADR supersedes. ADR 0036 is not affected: its rule about the dial's scale still holds.
- Not yet verified on a device. The iPhone 17 simulator check and a live heading on hardware are still to do.
