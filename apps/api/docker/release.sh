#!/bin/sh
# Production release step (ADR 0022, ADR 0044). Railway runs this once per deploy as the pre-deploy command, in a
# container with no volume and no audio. It runs the schema migrations and nothing else (CLAUDE.md: additive in
# production). A failure stops the deploy and the old version keeps serving.
#
# The pinned snapshots, the Azkar import (DB rows only, --defer-pack) and the pack build run at web start
# (docker/start-web.sh), where the volume is mounted: the import reads the audio files to decide which recording rows
# exist, so running it here would drop every recording row (B1, 2 Nov 2026). No seeders, factories or development
# fixtures run here. Nothing is skipped by a switch (ADR 0045: features enabled by default).
set -e

php artisan migrate --force
