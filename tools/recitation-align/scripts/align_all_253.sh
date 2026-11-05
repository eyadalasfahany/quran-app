#!/bin/bash
# Align every Islam Sobhi (moshaf 253) surah with the tool defaults (look-ahead 200, slack 2.0, star penalty 1.0,
# pause snapping on), then run the pause check. Resumable: a surah with an existing output is skipped.
set -u
export PATH=/opt/homebrew/bin:$PATH
export HF_HUB_OFFLINE=1
TOOL=$(cd "$(dirname "$0")/.." && pwd)
AUDIO=$TOOL/out/audio/mp3quran-253
OUT=$TOOL/out/253
mkdir -p "$OUT" "$TOOL/out/emissions"
cd "$TOOL" || exit 1
SUMMARY=$OUT/summary.tsv
[ -f "$SUMMARY" ] || printf "surah\tstatus\tsecs\twords\tmean_conf\tmin_ayah_conf\tpause_pct_1s\n" > "$SUMMARY"
for f in "$AUDIO"/*.mp3; do
  n=$(basename "$f" .mp3); s=$((10#$n))
  out="$OUT/$n.json"
  if [ -f "$out" ]; then continue; fi
  t0=$(date +%s)
  if uv run recitation-align run "$f" --surah "$s" --out "$out" --emissions-cache "$TOOL/out/emissions/253-$n.npz" > "$OUT/$n.log" 2>&1; then
    status=ok
  else
    status=FAILED; rm -f "$out"
  fi
  secs=$(( $(date +%s) - t0 ))
  if [ "$status" = ok ]; then
    stats=$(/usr/bin/python3 -c "
import json; d=json.load(open('$out')); ws=d['words']
from collections import defaultdict; c=defaultdict(list)
for w in ws: c[w['ayah']].append(w['confidence'])
a={k:sum(v)/len(v) for k,v in c.items()}
print(len(ws), round(sum(a.values())/len(a),3), round(min(a.values()),3), sep='\t')")
    pct=$(uv run python scripts/pause_check.py "$f" "$out" 2>/dev/null | grep 'within 1 s' | grep -oE '[0-9.]+%' | tr -d '%')
    printf "%s\t%s\t%s\t%s\t%s\n" "$n" "$status" "$secs" "$stats" "${pct:-?}" >> "$SUMMARY"
  else
    printf "%s\t%s\t%s\t-\t-\t-\t-\n" "$n" "$status" "$secs" >> "$SUMMARY"
  fi
  echo "$n $status ${secs}s"
done
echo "ALL DONE"
