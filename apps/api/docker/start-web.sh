#!/bin/sh
# Web service start (ADR 0040, ADR 0044, plan step 14). Railway's startCommand for the API service runs this through
# entrypoint.sh (config:cache first). It is never called from entrypoint.sh. Horizon and the scheduler run in this same
# container under supervisord (ADR 0065), started only after the steps below.
#
# Order: run migrations, create the storage folders, verify the Azkar audio, fetch the pinned secondary snapshots, import the Azkar rows
# (DB rows only, --defer-pack), fetch the pinned Duas HadeethEnc snapshot and import the Duas rows (DB rows only,
# --defer-pack), import the MP3Quran recitations, the Way2Quran recitations (once their committed manifest exists; ADR 0074),
# the Taybah timings (DB rows only, --defer-pack; ADR 0060, ADR 0061) and the Hadith rows (DB rows only, --defer-pack; ADR 0042,
# ADR 0076), build any missing packs, then hand over to supervisord, which runs the web server, Horizon and the
# scheduler (ADR 0065). The import runs here and not in release.sh, because only this container mounts the volume
# that holds the audio: run before the audio is in place, it would drop the recording rows. Every task logs and continues, so a failure never blocks serving; the current versions keep serving.
set -u

cd /app || exit 1

# Migrations run here too (6 Nov 2026): Railway's deployments showed no pre-deploy command, so release.sh never ran
# and production fell 18 migrations behind. `migrate --force` is a no-op when nothing is pending. Unlike the import
# steps below, a failure stops the start: serving new code on an old schema is worse than a failed deploy (the
# previous deployment keeps serving).
php artisan migrate --force || { echo "ERROR: migrations failed; not starting"; exit 1; }

mkdir -p storage/app/private/packs storage/app/tmp storage/app/azkar/reports storage/app/private/azkar-audio storage/app/private/sources \
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

# Way2Quran (ADR 0074): the manifest appears with the first merged Way2Quran PR, so until then the import is skipped, not
# failed. It runs before the Taybah timings, which attach to the chapter_audio_files rows this import writes.
if [ -f resources/way2quran/manifest.json ]; then
  if php artisan way2quran:import --defer-pack; then
    echo "start: Way2Quran recitations up to date"
  else
    echo "WARNING: the Way2Quran import did not finish (manifest or a reciter was refused; the lines above name it); the current Way2Quran versions keep serving."
  fi
else
  echo "start: no Way2Quran manifest yet; the Way2Quran import is skipped"
fi

if php artisan recitation-timings:import --defer-pack; then
  echo "start: Taybah recitation timings up to date"
else
  echo "WARNING: some Taybah timing files were skipped (the lines above name them and the reason); the current versions keep serving."
fi

# Hadith (ADR 0042, ADR 0076). Reads only the committed database/data/hadith files and the pinned fawazahmed0 snapshot
# (--download). No API key and no OpenITI folder are needed. Production never runs the dev-only hadith commands.
if php artisan hadith:import --download --defer-pack; then
  echo "start: hadith import done"
else
  echo "WARNING: the Hadith import did not finish (download, pin, validation or completeness); the current Hadith versions keep serving. The report lists the reason."
fi

if php artisan content:ensure-packs; then
  echo "start: content packs up to date"
else
  echo "WARNING: some content packs could not be built; the lines above name them. Serving continues."
fi

exec supervisord -c /etc/supervisor/taybah.conf
