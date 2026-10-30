# 0025 — Play glyph follows the layout direction

Date: 2026-10-30 · Status: accepted · Amends ADR 0012 (decision 2)

## Context

ADR 0012 mirrored audio progress and the previous and next ayah controls with the layout, but kept the play and pause glyphs fixed. In Arabic the play triangle then pointed right, against the direction the rest of the screen reads and plays. Some play buttons also stayed on play while that same audio was playing. The developer asked for both to change (30 Oct 2026).

## Decision

1. **Play mirrors.** Every play glyph follows the layout direction. In Arabic it points left; in English it points right. Pause is symmetric and needs no mirroring. This covers the full player, the tabs, sidebar and reader mini bars, Focus, the ayah row and the ayah actions, the Listen rows and Home's recent listens.
2. **Pause while playing.** A play control whose audio is playing shows pause, labelled «إيقاف مؤقت», and pauses when tapped:
   - The full player, the mini bars and Focus: whenever the player is playing.
   - The ayah row and the ayah actions: when that ayah is the one being recited.
   - A Listen row: when that reciter is playing.
   - A recent listen: when that reciter and surah are playing.

## Consequences

- ADR 0012's "play and pause glyphs never flip" no longer holds. The exit checks test that play points left in Arabic and right in English.
