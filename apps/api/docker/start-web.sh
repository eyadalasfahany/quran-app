#!/bin/sh
# Web service start (ADR 0040, ADR 0044, plan step 14). Railway's startCommand for the API service runs this through
# entrypoint.sh (config:cache first). It is never called from entrypoint.sh, because Horizon and the scheduler share that
# file and the volume is mounted only on the web service.
#
# Order: run migrations, create the storage folders, verify the Azkar audio, fetch the pinned secondary snapshots, import the Azkar rows
# (DB rows only, --defer-pack), fetch the pinned Duas HadeethEnc snapshot and import the Duas rows (DB rows only,
# --defer-pack), import the MP3Quran recitations and the Taybah timings (DB rows only, --defer-pack; ADR 0060,
# ADR 0061), build any missing packs, then serve. The import runs here and not in release.sh, because
# only this container mounts the volume that holds the audio: run before the audio is in place, it would drop the
# recording rows. Every task logs and continues, so a failure never blocks serving; the current versions keep serving.
set -u

cd /app || exit 1

# Migrations run here too (6 Nov 2026): Railway's deployments showed no pre-deploy command, so release.sh never ran
# and production fell 18 migrations behind. `migrate --force` is a no-op when nothing is pending. Unlike the import
# steps below, a failure stops the start: serving new code on an old schema is worse than a failed deploy (the
# previous deployment keeps serving).
php artisan migrate --force || { echo "ERROR: migrations failed; not starting"; exit 1; }

mkdir -p storage/app/private/packs storage/app/tmp storage/app/azkar/reports storage/app/private/azkar-audio \
  || echo "WARNING: could not create the storage folders under /app/storage/app"

if php artisan azkar:audio-verify; then
  echo "start: Azkar audio verified"
else
  echo "WARNING: Azkar audio is missing or damaged; recordings whose files are missing are left out, and Azkar packs that list audio are not built. Run azkar:audio-sync (runbook)."
fi

# Pinned secondary snapshots (ADR 0031 §12; ADR 0046 decision 11 reuses the HadeethEnc snapshot). A snapshot is kept only
# when its SHA-256 matches its pin; otherwise the import runs without it and the report says why.
snapshot_pinned() {
  php artisan azkar:snapshot "$1" --pinned || echo "WARNING: $1 snapshot not fetched or not matching its pin; the import runs without it (see the report)."
}

snapshot_pinned hisnmuslim
snapshot_pinned hadeethenc

if php artisan azkar:import --download --defer-pack; then
  echo "start: Azkar rows up to date"
else
  echo "WARNING: the Azkar import did not finish (download, checksum, validation or pin); the current Azkar version keeps serving. The report lists the reason."
fi

# Duas (ADR 0044-duas). Its HadeethEnc pin is separate from Azkar's (config/duas.php), so it is fetched here and not reused
# from the snapshot loop above.
if php artisan duas:snapshot hadeethenc --pinned; then
  echo "start: Duas HadeethEnc snapshot verified"
else
  echo "WARNING: the Duas HadeethEnc snapshot is not fetched or does not match its pin; the Duas import runs without it (see the report)."
fi

if php artisan duas:import --download --defer-pack; then
  echo "start: Duas rows up to date"
else
  echo "WARNING: the Duas import did not finish (the reviewed Quran map, the snapshot pin or validation refused it); the current Duas version keeps serving. The report lists the reason."
fi

if php artisan mp3quran:import --defer-pack; then
  echo "start: MP3Quran recitations up to date"
else
  echo "WARNING: the MP3Quran import did not finish (manifest or a moshaf was refused; the lines above name it); the current MP3Quran versions keep serving."
fi

if php artisan recitation-timings:import --defer-pack; then
  echo "start: Taybah recitation timings up to date"
else
  echo "WARNING: some Taybah timing files were skipped (the lines above name them and the reason); the current versions keep serving."
fi

if php artisan content:ensure-packs; then
  echo "start: content packs up to date"
else
  echo "WARNING: some content packs could not be built; the lines above name them. Serving continues."
fi

exec frankenphp run --config /etc/caddy/Caddyfile
