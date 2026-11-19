# 0095 — One setup command per feature

Date: 2026-11-19 · Status: **proposed**, awaiting the developer's acceptance. Adds to the production runbook (`docs/runbooks/railway-release.md`).

## Context

- Production imports were a list of about 25 commands that the developer ran by hand over `railway ssh`, in a fixed order. Each one had its own flags (`--defer-pack`, `--download`, `--pinned`, `--without-word-boxes` and so on). One missed or reordered step left content half-loaded.
- Azkar (ADR 0040, ADR 0045) and Duas (ADR 0044) already had one setup command each: `azkar:setup` and `duas:setup`.

## Decision

1. Five more setup commands, one per feature. Each runs that feature's import steps in order and stops at the first failure:
   - `quran:setup`: `qf:ping`, `content:sync` for each group in `quran.sync.groups` (or the `--group` values), `content:ensure-packs` (ADR 0041).
   - `recitations:setup`: `mp3quran:import`, `way2quran:import` (skipped when the manifest file is missing), `recitation-timings:import`, all with `--defer-pack`, then `content:ensure-packs` (ADR 0060, 0061, 0074).
   - `hadith:setup`: `hadith:import --download --defer-pack`, then the pinned explanations snapshot and `hadith:import-explanations` (unless `--skip-explanations`), then `content:ensure-packs` (ADR 0042, 0076, 0078).
   - `mushaf:setup`: `mushaf:import` per edition, `mushaf:build-word-boxes hafs`, `mushaf:publish` per edition, then `content:ensure-packs`. It never passes `--without-word-boxes`. It lifts the memory limit (ADR 0090).
2. `content:setup` runs the six feature setups in order: quran, recitations, azkar, duas, hadith, mushaf. `--skip` leaves features out, and `--skip-explanations` is passed to `hadith:setup`. Features are independent, so a failing feature is recorded, the run goes on, and the command exits 1 at the end with a summary line per feature.
3. `docker/start-web.sh` is unchanged. The pre-deploy container still runs only the steps that are safe on every start.
4. `names:import` and `seerah:import --release` are not in any setup command. Production refuses them until the developer signs off the content (ADR 0043, ADR 0091).

## Consequences

- The first production load is one command, `php artisan content:setup`, run from `/app` over `railway ssh`. It takes hours: about 1.6 GB of mushaf downloads and about an hour of HadeethEnc explanations (skip them with `--skip-explanations` to start faster).
- A re-run is safe to repeat: each step is an import or publish that the existing commands already make idempotent.
- The individual commands still exist for debugging and for one-off repairs. The runbook keeps them documented.
- Content owners who want a feature left out use `--skip`. No feature flag is added to the code.
