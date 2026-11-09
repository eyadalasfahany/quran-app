# 0086 — One last-known location for prayer times (9 Nov 2026)

Date: 2026-11-09 · Status: **accepted** (developer, 9 Nov 2026) · Amends ADR 0083 (amendment) and ADR 0030.

## Context

ADR 0083's amendment made the prayer and azkar notifications fall back to the last sync's coordinates when no fix was available. The screens did not. The الصلاة tab, Home, Menu, Qibla, Moon and the widgets showed "set your location", or a 30 s skeleton, while the notifications kept arriving for the last place. The developer asked for one behaviour everywhere: "we need to be consistent".

The live GPS read takes up to 30 s (`LOCATION_FIX_TIMEOUT_MS`), and it can fail indoors or with permission revoked. A prayer app that goes empty in those cases is not useful.

Research: the common pattern among prayer apps is to keep the last place and refresh it in the background. SalatTimes documents working offline after the first fix. Muslim Pro's and Pillars' fallback behaviour is not documented, so it is not relied on.

## Decision

1. One chain, `resolvePrayerCoordinates()`, is used by every consumer: a fresh fix (`getCoordinates`), else the saved last automatic place, else the last prayer sync's coordinates (a backstop for installs from before the saved place). `stale` is true when the fallback is used.
2. The last automatic place is saved only for an automatic fix, as a `coordsKey` (two decimals, about 1 km), on the device only, under `salah.lastAutoCoords`. A manual city never writes it. It is removed by «مسح البيانات» (ADR 0027), before the resyncs run.
3. Screens seed their first render from the saved place (`stale: true`, not pending), then run the normal read and replace it. A return to the app retries a fresh fix while the view is stale.
4. Any stale view is labelled «آخر موقع معروف» (en "Last known location") in the countdown card, including its accessible name.
5. The fallback also applies when location permission was revoked. The label makes that visible. The location sheet still shows its denied note.
6. Widgets, Home, Menu, Moon, Qibla, prayer notifications, azkar reminders and goal reminders all use the chain.

## Consequences

- Times and notifications agree on every surface, even with no fix.
- A place can be up to the last fix's age old (the last automatic fix is kept until the next one). The label says so.
- The saved place is a device-only derived value. It is never sent to the API or synced.
- The backstop can return the last synced place, which may be a manual city, after the user switches from manual to automatic with GPS denied. The label reads «آخر موقع معروف» for it. This is accepted for now.
- No new layout. The change is JavaScript only and ships as an EAS Update.
