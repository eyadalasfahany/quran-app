"""Disagreement detector (A6 step 3): where the default and overlapping-emissions aligners disagree.

  run     : align the flagged surahs with --overlap-emissions (resumable)
  compare : list ayahs whose start differs by more than 1 s, and compare with the review flags

Default output: out/253-v7/NNN.json. Overlap output: out/a6/dis-b/NNN.json.
Flags: out/253-review.json (stretches with lo..hi ayah ranges).
"""

import argparse
import json
import os
import subprocess
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
REVIEW = TOOL / "out" / "253-review.json"
A_DIR = TOOL / "out" / "253-v7"
B_DIR = TOOL / "out" / "a6" / "dis-b"
AUDIO = TOOL / "out" / "audio" / "mp3quran-253"
DISAGREE_S = 1.0


def flagged() -> dict[int, set[int]]:
    out: dict[int, set[int]] = {}
    for s in json.loads(REVIEW.read_text(encoding="utf-8"))["stretches"]:
        out.setdefault(s["surah"], set()).update(range(s["lo"], s["hi"] + 1))
    return out


def ayah_starts(path: Path) -> dict[int, int]:
    starts: dict[int, int] = {}
    for w in json.loads(path.read_text(encoding="utf-8"))["words"]:
        if w.get("basmala"):
            continue
        starts[w["ayah"]] = min(starts.get(w["ayah"], w["start_ms"]), w["start_ms"])
    return starts


def cmd_run(_: argparse.Namespace) -> None:
    B_DIR.mkdir(parents=True, exist_ok=True)
    for n in sorted(flagged()):
        out = B_DIR / f"{n:03d}.json"
        if out.exists():
            continue
        cache = TOOL / "out" / "emissions" / f"253-{n:03d}-ov.npz"
        cmd = ["uv", "run", "recitation-align", "run", str(AUDIO / f"{n:03d}.mp3"), "--surah", str(n),
               "--out", str(out), "--emissions-cache", str(cache), "--overlap-emissions"]
        print(f"surah {n}", flush=True)
        subprocess.run(cmd, cwd=TOOL, check=True, env={**os.environ, "HF_HUB_OFFLINE": "1"},
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def cmd_compare(_: argparse.Namespace) -> None:
    flags = flagged()
    disagree: set[tuple[int, int]] = set()
    rows = []
    for n in sorted(flags):
        a_path, b_path = A_DIR / f"{n:03d}.json", B_DIR / f"{n:03d}.json"
        if not (a_path.exists() and b_path.exists()):
            continue
        a, b = ayah_starts(a_path), ayah_starts(b_path)
        for ayah in sorted(set(a) & set(b)):
            d = abs(a[ayah] - b[ayah]) / 1000
            if d > DISAGREE_S:
                disagree.add((n, ayah))
                rows.append((n, ayah, d))
    flagged_set = {(n, a) for n, ayahs in flags.items() for a in ayahs}
    done_surahs = {n for n in flags if (B_DIR / f"{n:03d}.json").exists()}
    flagged_checked = {(n, a) for n, a in flagged_set if n in done_surahs}
    print(f"surahs compared: {len(done_surahs)} of {len(flags)} flagged")
    print(f"ayahs with start disagreement > {DISAGREE_S:g} s: {len(disagree)}")
    print(f"flagged ayahs (in compared surahs): {len(flagged_checked)}")
    print(f"overlap (flagged and disagree): {len(disagree & flagged_checked)}")
    print(f"only in disagreement (not flagged): {len(disagree - flagged_checked)}")
    print(f"only in flags (no disagreement): {len(flagged_checked - disagree)}")
    for n, ayah, d in sorted(rows):
        print(f"  {n:03d}:{ayah}  |d| {d:.2f} s  {'flagged' if (n, ayah) in flagged_set else 'not flagged'}")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("run").set_defaults(func=cmd_run)
    sub.add_parser("compare").set_defaults(func=cmd_compare)
    args = p.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
