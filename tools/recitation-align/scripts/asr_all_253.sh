#!/bin/bash
# Transcribe Islam Sobhi (moshaf 253) surahs once with the pinned Tarteel ASR. Resumable: a surah whose
# cache file exists is skipped. Fixed-list surahs first, then the rest in order.
set -u
export PATH=/opt/homebrew/bin:$PATH
export HF_HUB_OFFLINE=1
TOOL=$(cd "$(dirname "$0")/.." && pwd)
AUDIO=$TOOL/out/audio/mp3quran-253
ASR=$TOOL/out/asr
mkdir -p "$ASR"
cd "$TOOL" || exit 1
PRIORITY="012 023 027 003 055 028 029 030 038 043 048 052 095 096 097 098 099 100 101 102 103 104 105 106 107 108 109 110 111"
ORDER="$PRIORITY $(ls "$AUDIO" | sed 's/\.mp3$//' | grep -vxF -f <(echo $PRIORITY | tr ' ' '\n'))"
for n in $ORDER; do
  f="$AUDIO/$n.mp3"
  [ -f "$f" ] || continue
  out="$ASR/253-$n.json"
  if [ -f "$out" ]; then continue; fi
  t0=$(date +%s)
  if uv run python "$TOOL/scripts/asr_one.py" "$f" "$out.tmp" > "$ASR/$n.log" 2>&1; then
    mv "$out.tmp" "$out"; status=ok
  else
    status=FAILED; rm -f "$out.tmp"
  fi
  echo "$n $status $(( $(date +%s) - t0 ))s" >> "$ASR/progress.txt"
done
echo "ALL DONE" >> "$ASR/progress.txt"
