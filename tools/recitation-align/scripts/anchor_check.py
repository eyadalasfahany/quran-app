"""B4 (plan way2quran-quality): anchoring changes nothing where today's aligner works. Reviewer check, local.

  anchor_check.py --aligned out/way2quran/ID/aligned/NNN.json --audio NNN.mp3 --emissions E.npz \
      --pauses P.pauses.json [--published TIMING.json --exclude 1 --exclude 80-84]

`--aligned` is a quality-mode (anchored) document from `pilot_published.py --quality`. The script runs today's
whole-surah aligner on the same emissions (`align_full`, then `snap_to_pauses`, as `run_aligner` does) and prints
how many ayah starts and word starts are equal to the millisecond. With `--published` (a format 1 timing file) it
also prints how many anchored ayah starts lie within 0.3 s of the published ones, ayahs in `--exclude` left out.
Counts and keys only. Exit 0 when every ayah and word start is equal, 1 otherwise.
"""

import argparse
import json
import statistics
import sys
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOL_DIR))

DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
TOLERANCE_MS = 300


def ayah_starts(words: list[dict]) -> dict[int, int]:
    out: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            out[w["ayah"]] = min(out.get(w["ayah"], w["start_ms"]), w["start_ms"])
    return out


def excluded(spec: list[str]) -> set[int]:
    out: set[int] = set()
    for item in spec:
        lo, _, hi = item.partition("-")
        out.update(range(int(lo), int(hi or lo) + 1))
    return out


def compare(anchored: list[dict], base: list[dict]) -> dict:
    a, b = ayah_starts(anchored), ayah_starts(base)
    aw = {(w["ayah"], w["position"]): w["start_ms"] for w in anchored}
    bw = {(w["ayah"], w["position"]): w["start_ms"] for w in base}
    common = sorted(set(a) & set(b))
    wcommon = sorted(set(aw) & set(bw))
    return {
        "ayahs": len(b), "ayahs_equal": sum(a[k] == b[k] for k in common),
        "ayahs_differ": [k for k in common if a[k] != b[k]],
        "words": len(bw), "words_equal": sum(aw[k] == bw[k] for k in wcommon),
        "words_missing": len(set(bw) ^ set(aw)),
    }


def against_published(anchored: list[dict], published: dict, skip: set[int]) -> dict:
    pub = {int(r["verse_key"].split(":")[1]): r["start_ms"] for r in published["ayahs"]}
    ours = ayah_starts(anchored)
    diffs = {k: ours[k] - pub[k] for k in pub if k in ours and k not in skip}
    absd = sorted(abs(v) for v in diffs.values())
    return {"n": len(diffs), "within_300ms": sum(d <= TOLERANCE_MS for d in absd),
            "median_ms": round(statistics.median(absd)) if absd else None,
            "worst": sorted(((k, v) for k, v in diffs.items()), key=lambda kv: -abs(kv[1]))[:3]}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--aligned", type=Path, required=True)
    p.add_argument("--audio", type=Path, required=True)
    p.add_argument("--emissions", type=Path, required=True)
    p.add_argument("--pauses", type=Path, required=True)
    p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    p.add_argument("--published", type=Path, default=None)
    p.add_argument("--exclude", action="append", default=[], help="ayah or range left out of --published")
    args = p.parse_args(argv)

    from recitation_align.align import align_full, emission_key, load_emissions
    from recitation_align.audio import file_sha256, load_wav16k
    from recitation_align.snap import SNAP_WINDOW_MS, snap_to_pauses
    from recitation_align.text import load_tanzil

    doc = json.loads(args.aligned.read_text(encoding="utf-8"))
    if "anchors" not in doc:
        print(f"{args.aligned}: not an anchored (quality-mode) document", file=sys.stderr)
        return 2
    sha = file_sha256(args.audio)
    if sha != doc["audio"]["sha256"]:
        print("the audio is not the aligned document's file (sha256 differs)", file=sys.stderr)
        return 2
    em = load_emissions(args.emissions, emission_key(sha))
    if em is None:
        print(f"{args.emissions}: no emissions for this audio", file=sys.stderr)
        return 2
    pauses = [tuple(x) for x in json.loads(args.pauses.read_text(encoding="utf-8"))["pauses"]]
    ayahs = load_tanzil(args.tanzil)
    wav = load_wav16k(args.audio)
    base, _, _ = align_full(wav, doc["surah"], ayahs, em=em, pauses=pauses)
    snap_to_pauses(base, pauses, window_ms=SNAP_WINDOW_MS)
    base.sort(key=lambda w: (w["ayah"], w["position"]))

    r = compare(doc["words"], base)
    anchors = doc["anchors"]
    print(f"surah {doc['surah']}: cuts {len(anchors['cuts'])}, merges {len(anchors['merges'])}; ayah starts equal "
          f"{r['ayahs_equal']}/{r['ayahs']}; word starts equal {r['words_equal']}/{r['words']}"
          + (f"; differing ayahs {r['ayahs_differ'][:10]}" if r["ayahs_differ"] else ""))
    if args.published:
        pub = against_published(doc["words"], json.loads(args.published.read_text(encoding="utf-8")),
                                excluded(args.exclude))
        print(f"against published: {pub['within_300ms']}/{pub['n']} ayah starts within 0.3 s, median "
              f"{pub['median_ms']} ms, worst {pub['worst']}")
    ok = r["ayahs_equal"] == r["ayahs"] and r["words_equal"] == r["words"] and r["words_missing"] == 0
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
