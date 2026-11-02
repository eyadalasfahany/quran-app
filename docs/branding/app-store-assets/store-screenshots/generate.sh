#!/usr/bin/env bash
# Rebuild every store screenshot from sources/raw + sources/manifest.json (captions).
# Needs Google Chrome (headless) and ImageMagick. Optional: --only <outDir part>, e.g. --only ipad-13
set -euo pipefail
cd "$(dirname "$0")"
python3 sources/compose.py "$@"
