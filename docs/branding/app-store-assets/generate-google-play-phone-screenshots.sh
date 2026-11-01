#!/usr/bin/env bash
# Google Play phone screenshots: 9:16 PNG, 1080×1920 (Play accepts 320–3840 px per side).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
FRAMES=(
  Main:01-home
  Mushaf:02-mushaf
  Search:03-search
  Player:04-player
  Salah:05-salah
  Qibla:06-qibla
  MainAzkar:07-azkar-home
  Reciters:08-reciters
)
OUT="$ROOT/docs/branding/app-store-assets/google-play/phone"
TMP="$OUT/.raw"
mkdir -p "$OUT" "$TMP"
for entry in "${FRAMES[@]}"; do
  frame="${entry%%:*}"
  slug="${entry##*:}"
  raw="$TMP/${slug}.png"
  final="$OUT/taybah-phone-${slug}.png"
  python3 "$ROOT/packages/design-tokens/scripts/frame-shot.py" "$frame" "$raw"
  magick "$raw" -gravity center -background '#F7F3EA' -resize 1080x1920^ -extent 1080x1920 "$final"
  echo "$final"
done
rm -rf "$TMP"
