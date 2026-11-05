"""Check ayah starts against the pauses in the audio (ADR 0052 style metric).

Usage: uv run python scripts/pause_check.py AUDIO OUT.json [--tolerance-s 1.0] [--noise-db -22] [--min-silence-s 0.4]

Pauses come from `ffmpeg silencedetect`. A pause is the interval [silence_start, silence_end].
An ayah start is the start_ms of its first word, excluding the basmala. Its distance is 0 when
it falls inside a pause, otherwise the gap to the nearest pause edge. Prints the share of ayah
starts within the tolerance (default 1 s, and the 0.7 s used by the ADR 0052 audit) and the
worst boundaries. Reads only; writes nothing.
"""

import argparse
import json
import statistics
import sys
from pathlib import Path

from recitation_align.pauses import DEFAULT_NOISE_DB, detect_pauses

def distance_to_pauses(t: float, pauses: list[tuple[float, float]]) -> float:
    """Seconds from t to the nearest pause (0 when t is inside one)."""
    best = float("inf")
    for s, e in pauses:
        d = 0.0 if s <= t <= e else min(abs(t - s), abs(t - e))
        best = min(best, d)
    return best


def ayah_starts(words: list[dict]) -> list[tuple[int, int, int]]:
    """(surah, ayah, start_ms) for each ayah, from the first word that is not basmala."""
    first: dict[tuple[int, int], int] = {}
    for w in words:
        if w.get("basmala"):
            continue
        key = (w["surah"], w["ayah"])
        first[key] = min(first.get(key, w["start_ms"]), w["start_ms"])
    return [(s, a, ms) for (s, a), ms in sorted(first.items())]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("audio", type=Path)
    parser.add_argument("out", type=Path, help="timings JSON written by recitation-align")
    parser.add_argument("--tolerance-s", type=float, default=1.0)
    parser.add_argument("--noise-db", type=float, default=DEFAULT_NOISE_DB)
    parser.add_argument("--min-silence-s", type=float, default=0.4, help="pause_check metric uses 0.4 s; snapping uses 0.25 s")
    parser.add_argument("--worst", type=int, default=5, help="how many worst boundaries to list")
    args = parser.parse_args(argv)

    if not args.audio.is_file() or not args.out.is_file():
        print("error: audio or timings file not found", file=sys.stderr)
        return 2
    data = json.loads(args.out.read_text(encoding="utf-8"))
    pauses = detect_pauses(args.audio, args.noise_db, args.min_silence_s)
    starts = ayah_starts(data["words"])
    if not starts:
        print("error: no ayah starts in the timings file", file=sys.stderr)
        return 2

    rows = []
    for surah, ayah, start_ms in starts:
        d = distance_to_pauses(start_ms / 1000, pauses)
        rows.append((d, surah, ayah, start_ms))
    dists = [r[0] for r in rows]
    within = sum(d <= args.tolerance_s for d in dists) / len(dists) * 100
    within_07 = sum(d <= 0.7 for d in dists) / len(dists) * 100

    print(f"file: {args.out.name}  audio: {args.audio.name}  pauses: {len(pauses)}")
    print(f"ayah starts: {len(rows)}")
    print(f"within {args.tolerance_s:g} s of a pause: {within:.1f}%")
    print(f"within 0.7 s of a pause (ADR 0052 audit tolerance): {within_07:.1f}%")
    print(f"distance to nearest pause: median {statistics.median(dists):.2f} s, "
          f"mean {statistics.fmean(dists):.2f} s, max {max(dists):.2f} s")
    print(f"worst {args.worst}:")
    for d, surah, ayah, start_ms in sorted(rows, reverse=True)[:args.worst]:
        print(f"  {surah}:{ayah}  start {start_ms / 1000:.2f} s  distance {d:.2f} s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
