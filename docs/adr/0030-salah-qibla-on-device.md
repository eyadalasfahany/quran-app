---
adr: 0030
title: Salah and Qibla on-device
status: accepted
amended_by: 0047
date: 2026-10-31
---

## Context

The app needs to provide prayer times and Qibla direction. To ensure offline-first functionality and avoid reliance on external APIs for core features, these computations should occur on the device. This ADR outlines the technical decisions for implementing Salah (prayer) times and Qibla (direction of Kaaba) functionality.

## Decision

Salah times and Qibla direction will be computed on-device using `adhan-js` and `expo-location`.

1.  **Prayer Time Calculation**:
    *   **Library**: `adhan-js` version 4.4.6 will be used for prayer time calculations.
    *   **Method**: Fixed calculation method of Umm al-Qura (for Fajr and Isha) and Shafi'i Asr method will be used. No method picker will be offered in v1 to simplify the user experience and reduce configuration complexity.
    *   **Offline-first**: Prayer times will be calculated based on the device's current location and time, ensuring functionality without network access.

2.  **Qibla Direction Calculation**:
    *   **Library**: `expo-location` will be used to get device orientation and location.
    *   **Offline-first**: Qibla direction will be calculated based on the device's location and compass, working fully offline.

3.  **Local Prayer Notifications**:
    *   **Scheduling**: Notifications for upcoming prayers will be scheduled locally on the device using a rolling 8-day schedule.
    *   **Sound** (amended by ADR 0047, accepted 2 Nov 2026: the user picks the system sound, silent, or a bundled adhan voice; the rule below is replaced): Standard system notification sounds will be used. No bundled Adhan (call to prayer) audio will be included in v1 to keep the app size small and avoid licensing complexities.

4.  **Navigation**:
    *   **Tab Bar**: A five-tab navigation system will be implemented at the bottom.
    *   **Order**: The tab order (RTL, right-to-left) will be: الرئيسية (Home), المصحف (Mushaf), مصحفي (My Quran, center), الاستماع (Listen), الصلاة (Salah).
    *   **Sidebar**: In expanded layouts, مصحفي (person-circle glyph) is the first sidebar item, followed by الرئيسية، المصحف، الاستماع، الصلاة.

5.  **City Gazetteer**:
    *   **Data Source**: A hand-compiled, on-device city gazetteer will be used to provide location context for prayer times (e.g., city name in the Salah screen).
    *   **Attribution**: No attribution will be required or displayed for this data.

6.  **Hijri Date**:
    *   **Source**: Computed on-device with `Intl.DateTimeFormat` using the `islamic-umalqura` calendar (ICU on both Hermes platforms) — the same Umm al-Qura calendar as the prayer-time method. No network, no cache, always exact.
    *   **Display**: `formatHijriDate(date, locale)` in `src/core/i18n/dates.ts` («٢٠ جمادى الأولى ١٤٤٨» / "Jumada I 20, 1448"), era suffix (هـ/AH) stripped per the `#Salah` frame.
    *   **Rejected**: fetching from a free online Hijri API (e.g. Aladhan) — the app calls only our API (non-negotiable #2), and proxying it through our API adds server work for no accuracy gain; a `GET /bootstrap` field with local day-increment — contract work plus drift across Hijri month boundaries.

7.  **Scenic Imagery**:
    *   The Salah screen shows real photographic sky scenes (dawn, sunrise, midday sun, afternoon, sunset, night) faded under a theme-colored scrim: one scene per prayer row and a sunset seascape on the hero card, per the approved `#Salah` / `#SalahDark` frames.
    *   Design-source photos live in `design-assets/salah/`; the app bundles derivatives under `apps/mobile/assets/salah/` and renders them with `expo-image` plus a theme scrim. No network fetch, no attribution required (generated artwork).

## Consequences

*   **Positive**:
    *   Offline-first prayer times and Qibla direction ensure usability in all network conditions.
    *   Reduced server load due to on-device calculations.
    *   Simpler v1 experience without complex method pickers.
    *   Consistent navigation across phone and expanded layouts.

*   **Negative**:
    *   `adhan-js` might have slight variations in prayer times compared to local mosque schedules; v1 will not offer customization.
    *   Maintaining a hand-compiled city gazetteer requires manual updates.
    *   No custom Adhan audio in v1 might be a feature gap for some users.

## Alternatives Considered

*   **Prayer Times API**: Using an external API for prayer times was rejected due to the requirement for offline functionality and potential rate limits/cost.
*   **Third-party Qibla SDKs**: Considered but `expo-location` provides sufficient capabilities with less overhead.
*   **Dynamic Prayer Method Picker**: Deferred to a future version to simplify v1 scope and user experience.

## Amendment: the dial turns with the phone (developer, 1 Nov 2026; frame caption awaiting approval)

The developer reported that the fixed north-up dial was confusing: facing the qibla, the needle pointed up while the Kaaba marker sat off to the side. With a live, good-accuracy heading:
- The dial face (ticks, numerals, cardinals, gold arc, Kaaba marker) rotates by −heading, so ش points to true north and the Kaaba marker points to Makkah on screen.
- Cardinals, numerals and the Kaaba glyph stay upright.
- A fixed lubber mark at the top of the bezel shows the direction the phone faces.
- The needle still points at bearing − heading, so it lines up with the marker. Facing the qibla, both sit at the lubber mark.

With no live heading (no compass, no good sample yet) or with Reduce Motion, the dial stays static north-up with a note saying so.
