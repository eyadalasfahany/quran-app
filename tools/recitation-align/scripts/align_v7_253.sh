#!/bin/bash
# v7: v6 (muqatta'at, basmala decision, leading star, pause snapping, global anchors off) plus the
# anomaly-triggered local repair (ASR only on stretches the first pass gets wrong). Resumable: a surah
# with an existing output is skipped. Writes out/253-v7/summary.tsv.
set -u
export PATH=/opt/homebrew/bin:$PATH
export HF_HUB_OFFLINE=1
TOOL=$(cd "$(dirname "$0")/.." && pwd)
AUDIO=$TOOL/out/audio/mp3quran-253
OUT=$TOOL/out/253-v7
mkdir -p "$OUT" "$TOOL/out/emissions"
cd "$TOOL" || exit 1
SUMMARY=$OUT/summary.tsv
[ -f "$SUMMARY" ] || printf "surah\tstatus\tsecs\twords\tayahs\tlt04_ayahs\tmean_conf\tbasmala_recited\trepairs\taccepted\tasr_seconds\n" > "$SUMMARY"
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
rp=d.get('repairs',[])
print(len(ws), len(a), sum(1 for v in a.values() if v<0.4), round(sum(w['confidence'] for w in ws)/len(ws),3), d.get('basmala_recited'), len(rp), sum(1 for r in rp if r['status']=='accepted'), sep='\t')")
    asr=$(grep -o "ASR [0-9]*s" "$OUT/$n.log" | grep -o "[0-9]*" | tail -1)
    printf "%s\t%s\t%s\t%s\t%s\t%s\n" "$n" "$status" "$secs" "$stats" "${asr:-0}" >> "$SUMMARY"
  else
    printf "%s\t%s\t%s\t-\t-\t-\t-\t-\t-\t-\t-\n" "$n" "$status" "$secs" >> "$SUMMARY"
  fi
  echo "$n $status ${secs}s"
done
echo "ALL DONE"
