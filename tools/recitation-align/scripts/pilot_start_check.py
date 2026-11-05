"""Independent check of published ayah starts (pilot, no pauses needed).

Usage (from tools/recitation-align):
    uv run python scripts/pilot_start_check.py --moshaf 86 --surah 18 ...

The pause metric finds only a few silences in these recitations, so it cannot judge the published
starts. This check runs the normal unconstrained aligner (align_full, cached emissions, no marks, no
snapping) and compares each ayah's first non-basmala word with the published start (ayahs 2..N).
Reads only; writes nothing. Prints counts and ayah keys only.
"""

import argparse
import json
import statistics
import sys
from pathlib import Path

from recitation_align.align import align_full, emission_key, load_emissions
from recitation_align.audio import file_sha256, load_wav16k
from recitation_align.published import PublishedError, normalise
from recitation_align.text import load_tanzil

TOOL_DIR = Path(__file__).resolve().parents[1]
INGEST_OUT = (TOOL_DIR / "../mp3quran-ingest/out").resolve()
DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
TOLERANCE_S = 1.0
BIG_S = 3.0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshaf", type=int, default=86)
    p.add_argument("--surah", type=int, action="append", required=True, dest="surahs")
    p.add_argument("--manifest", type=Path, default=INGEST_OUT / "test-manifest-86.json")
    p.add_argument("--audio-dir", type=Path, default=INGEST_OUT / "audio" / "mp3quran-86")
    p.add_argument("--raw-dir", type=Path, default=TOOL_DIR / "out" / "published" / "86")
    p.add_argument("--emissions-dir", type=Path, default=TOOL_DIR / "out" / "emissions")
    p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    args = p.parse_args(argv)

    ayahs = load_tanzil(args.tanzil)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    files = {f["surah"]: f for m in manifest["moshafs"] if str(m["moshaf_id"]) == str(args.moshaf)
             for f in m["files"]}
    status = 0
    for surah in sorted(set(args.surahs)):
        entry = files[surah]
        audio = args.audio_dir / f"{surah:03d}.mp3"
        sha = file_sha256(audio)
        em = load_emissions(args.emissions_dir / f"{args.moshaf}-{surah:03d}.npz", emission_key(sha))
        if em is None:
            print(f"{surah:03d}: REFUSED: no cached emissions", file=sys.stderr)
            status = 1
            continue
        raw = json.loads((args.raw_dir / f"raw-{surah}.json").read_text(encoding="utf-8"))
        count = sum(1 for s, _ in ayahs if s == surah)
        try:
            norm = normalise(raw, surah=surah, verse_count=count, duration_ms=entry["duration_ms"])
        except PublishedError as err:
            print(f"{surah:03d}: REFUSED: {err}", file=sys.stderr)
            status = 1
            continue
        wav = load_wav16k(audio)
        words, _, _ = align_full(wav, surah, ayahs, em=em)
        first: dict[int, int] = {}
        for w in sorted(words, key=lambda w: (w["ayah"], w["position"])):
            if not w.get("basmala"):
                first.setdefault(w["ayah"], w["start_ms"])
        diffs = {a: (first[a] - norm.starts[a]) / 1000 for a in norm.starts if a >= 2 and a in first}
        absd = [abs(d) for d in diffs.values()]
        within = sum(d <= TOLERANCE_S for d in absd)
        big = sorted((a for a, d in diffs.items() if abs(d) > BIG_S), key=lambda a: -abs(diffs[a]))
        med = statistics.median(absd) if absd else float("nan")
        bias = statistics.median(diffs.values()) if diffs else float("nan")
        print(f"{surah:03d}: ayah starts (2..N) within 1 s of the unconstrained aligner "
              f"{within}/{len(absd)} ({100 * within / max(len(absd), 1):.1f}%), median |diff| {med:.2f} s, "
              f"median signed diff (aligner - published) {bias:+.2f} s, ayahs over {BIG_S:g} s: {len(big)} "
              f"{[f'{surah}:{a}' for a in big[:8]]}")
    return status


if __name__ == "__main__":
    raise SystemExit(main())
