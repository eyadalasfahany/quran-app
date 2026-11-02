#!/bin/sh
# Web service start (ADR 0044). Railway mounts the pack volume only here, not in pre-deploy, so missing packs
# (a new azkar version, or recovery after volume loss) are built now. A failed build is logged and never blocks
# start: the manifest leaves out packs whose file is missing, and a volume service has no old version serving.
set -e
php artisan content:ensure-packs || echo "content:ensure-packs failed; serving without the missing packs." >&2
exec frankenphp run --config /etc/caddy/Caddyfile
