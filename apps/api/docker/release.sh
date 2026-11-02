#!/bin/sh
# Production release steps (ADR 0022, ADR 0031 §11). Railway runs this once per deploy as the pre-deploy command,
# after the image is built and before the new version starts. The order matters:
#   1. schema migrations (additive in production, CLAUDE.md)
#   2. the Azkar import: downloads the pinned OpenDua file, verifies its SHA-256, and exits 0 while the import is
#      locked. When unlocked it writes the rows only (--defer-pack). This container has no volume, so the pack is
#      not built here; the web service builds missing packs at start (ADR 0044).
# No seeders, factories or development fixtures run here. A failure stops the deploy and the old version keeps serving.
set -e

php artisan migrate --force
php artisan azkar:import --download --if-unlocked --defer-pack
