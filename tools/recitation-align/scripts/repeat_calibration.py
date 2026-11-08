"""Repeat calibration on QF Afasy (plan way2quran-quality Q7c, ADR 0077 decision 4). Local only.

    repeat_calibration.py [--surah 1 2 18 36 59] [--penalty 6 ...] [--margin 0.02 ...] [--control-every 3]
                          [--out checks/repeat-calibration.json] [--record]

The repeat stage is run alone, ayah by ayah, on the QF Afasy audio (`out/audio/qf-afasy/NNN.mp3`), against QF's word
segments (`out/a6/ref/qf-NNN.json`, gitignored QF data):

- the region of an ayah is QF's own ayah span, so the stage is measured apart from the anchors and the aligner;
- dense ASR over it (`repeats.dense_windows`, cached in `out/a6/repeat-cache/`), the recited sequence at each
  `--penalty`, the per-jump CTC confirm at each `--margin`, the re-align (`realign_region`) and the export mapping
  (`export.map_segments`, what ships);
- repeat ayahs are QF's ayahs with a repeated position. Control ayahs are all the others in 1, 18, 36 and 59, and
  every `--control-every`-th of 2.

Metrics (targets from the plan): `reproduced_share`, the share of QF's repeat occurrences (a position recited again
inside its ayah) that come out as the same position at the same place in the sequence (>= 0.90); `median_ms` and
`p90_ms` of the start error on those occurrences (<= 60 and <= 150); `false_repeats`, control ayahs that come out with
a repeated position (0). Only numbers and verse counts are written: no QF text, no QF timings.

With `--record`, the setting of the frozen PARAMS (or else the best one) is appended to the calibration record with
the whole sweep; `passed` false means REPEAT_MODE "null" (P14).
"""

import argparse
import datetime
import difflib
import json
import statistics
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

REF_DIR = TOOL / "out" / "a6" / "ref"
AUDIO_DIR = TOOL / "out" / "audio" / "qf-afasy"
CACHE_DIR = TOOL / "out" / "a6" / "repeat-cache"
DEFAULT_OUT = TOOL / "checks" / "repeat-calibration.json"
TANZIL = (TOOL / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
SURAHS = [1, 2, 18, 36, 59]
TARGETS = {"reproduced_share": 0.90, "median_ms": 60, "p90_ms": 150, "false_repeats": 0}


# --- metrics (pure, tested with synthetic references) ---------------------------------------------------------------

def is_repeat(ref_words: list[dict]) -> bool:
    """A QF ayah with a repeated position."""
    idx = [w["index"] for w in ref_words]
    return len(set(idx)) < len(idx)


def repeat_passes(positions: list[int]) -> set[int]:
    """Indices of the occurrences that recite a position again (not its first pass)."""
    seen, out = set(), set()
    for i, p in enumerate(positions):
        if p in seen:
            out.add(i)
        seen.add(p)
    return out


def compare(ours: list[list[int]], ref_words: list[dict]) -> dict:
    """Our segments [[qf position, start, end], ...] (recited order) against QF's word segments.

    The two position sequences are aligned (difflib, no junk heuristic). A QF repeat occurrence is reproduced when it
    is matched to one of our segments that is a repeat occurrence too; its start error is then measured.
    """
    ref = sorted(ref_words, key=lambda w: w["start_ms"])
    rp, op = [w["index"] for w in ref], [s[0] for s in ours]
    r_rep, o_rep = repeat_passes(rp), repeat_passes(op)
    sm = difflib.SequenceMatcher(None, rp, op, autojunk=False)
    reproduced, errors, all_errors = 0, [], []
    for block in sm.get_matching_blocks():
        for k in range(block.size):
            i, j = block.a + k, block.b + k
            err = abs(ours[j][1] - ref[i]["start_ms"])
            all_errors.append(err)
            if i in r_rep and j in o_rep:
                reproduced += 1
                errors.append(err)
    return {"repeat_occurrences": len(r_rep), "reproduced": reproduced, "errors": errors, "all_errors": all_errors,
            "exact": rp == op, "our_repeat": bool(o_rep)}


def _pct(values: list[float], q: float):
    if not values:
        return None
    s = sorted(values)
    return round(s[min(len(s) - 1, int(q * len(s)))])


def summarise(repeat_results: list[dict], control_results: list[dict]) -> dict:
    occ = sum(r["repeat_occurrences"] for r in repeat_results)
    rep = sum(r["reproduced"] for r in repeat_results)
    errs = [e for r in repeat_results for e in r["errors"]]
    out = {
        "repeat_ayahs": len(repeat_results), "repeat_occurrences": occ,
        "reproduced_share": round(rep / occ, 4) if occ else None,
        "exact_ayahs": sum(r["exact"] for r in repeat_results),
        "median_ms": round(statistics.median(errs)) if errs else None, "p90_ms": _pct(errs, 0.9),
        "control_ayahs": len(control_results), "false_repeats": sum(r["our_repeat"] for r in control_results),
    }
    out["passed"] = (out["reproduced_share"] is not None and out["reproduced_share"] >= TARGETS["reproduced_share"]
                     and out["median_ms"] is not None and out["median_ms"] <= TARGETS["median_ms"]
                     and out["p90_ms"] <= TARGETS["p90_ms"] and out["false_repeats"] <= TARGETS["false_repeats"])
    return out


def best(settings: list[dict]) -> dict:
    """The passing setting with the highest reproduced share (then the lowest p90), else the best failing one:
    fewest false repeats first."""
    passing = [s for s in settings if s["passed"]]
    pool = passing or settings
    return max(pool, key=lambda s: (-s["false_repeats"], s["reproduced_share"] or 0, -(s["p90_ms"] or 1e9)))


# --- the run (models; local) -----------------------------------------------------------------------------------------

def _dense(wav, cache_path: Path, windows):
    from recitation_align.transcribe import _window_key, transcribe_clips

    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.is_file() else {}
    missing = [w for w in windows if _window_key(*w) not in cache]
    if missing:
        for w, c in zip(missing, transcribe_clips(wav, missing)["clips"]):
            cache[_window_key(*w)] = c["text"]
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    return [cache[_window_key(*w)] for w in windows]


def _emissions(n: int, wav):
    from recitation_align.align import compute_emissions, load_emissions, save_emissions

    path = CACHE_DIR / f"qf-{n:03d}.npz"
    key = f"qf-afasy-{n:03d}|{len(wav)}"
    em = load_emissions(path, key)
    if em is None:
        em = compute_emissions(wav)
        save_emissions(path, key, em)
    return em


def run_surah(n: int, ayahs: dict, vocab: dict, blank: int, penalties, margins, control_every: int) -> dict:
    """{(penalty, margin): {"repeat": [compare], "control": [compare]}} for one surah."""
    from recitation_align import repeats as rp
    from recitation_align.audio import load_wav16k
    from recitation_align.export import map_segments
    from recitation_align.quality import PARAMS
    from recitation_align.text import norm

    refs = json.loads((REF_DIR / f"qf-{n:03d}.json").read_text(encoding="utf-8"))
    wav = load_wav16k(AUDIO_DIR / f"{n:03d}.mp3")
    em = _emissions(n, wav)
    spf = len(wav) / 16000 / em.shape[0]
    out = {(p, m): {"repeat": [], "control": []} for p in penalties for m in margins}
    controls = [r for r in refs if r["words"] and not is_repeat(r["words"])]
    controls = controls if n != 2 else controls[::control_every]
    chosen = [(r, "repeat") for r in refs if r["words"] and is_repeat(r["words"])] + [(r, "control") for r in controls]
    for ref, kind in chosen:
        a = ref["ayah"]
        region = rp.Region(a, a, start_ms=ref["start_ms"], end_ms=ref["end_ms"])
        f0, f1 = max(0, round(ref["start_ms"] / 1000 / spf)), min(em.shape[0], round(ref["end_ms"] / 1000 / spf))
        rt = rp.region_text(n, ayahs, a, a, vocab, f0=f0, f1=f1, spf=spf)
        if not rt.sw:
            continue
        texts = _dense(wav, CACHE_DIR / f"qf-{n:03d}.json", rp.dense_windows(region))
        asr = rp.stitch_windows([norm(t).split() for t in texts])
        for p in penalties:
            seq = rp.recited_sequence(asr, rt.keys, p)
            for m in margins:
                saved = PARAMS["CTC_MARGIN"]
                PARAMS["CTC_MARGIN"] = m
                try:
                    final, _ = rp.confirm_jumps(em, rt, seq, blank)
                finally:
                    PARAMS["CTC_MARGIN"] = saved
                try:
                    words = rp.realign_region(em, rt, final, blank)
                except (RuntimeError, ValueError):
                    words = []
                ours = map_segments(sorted(words, key=lambda w: w["start_ms"])) if words else []
                out[(p, m)][kind].append(compare(ours, ref["words"]))
        print(f"{n}:{a} {kind} done", file=sys.stderr, flush=True)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--surah", type=int, nargs="*", default=SURAHS)
    ap.add_argument("--penalty", type=float, nargs="*", default=None)
    ap.add_argument("--margin", type=float, nargs="*", default=None)
    ap.add_argument("--control-every", type=int, default=3)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--record", action="store_true", help="append the chosen setting to the calibration record")
    args = ap.parse_args(argv)

    from recitation_align.align import load_vocab
    from recitation_align.quality import PARAMS, code_digest, params_digest, tool_version
    from recitation_align.text import load_tanzil

    penalties = args.penalty or [PARAMS["BACK_PENALTY"]]
    margins = args.margin or [PARAMS["CTC_MARGIN"]]
    ayahs = load_tanzil(TANZIL)
    vocab, blank = load_vocab()
    pooled = {(p, m): {"repeat": [], "control": []} for p in penalties for m in margins}
    for n in args.surah:
        for k, v in run_surah(n, ayahs, vocab, blank, penalties, margins, args.control_every).items():
            pooled[k]["repeat"] += v["repeat"]
            pooled[k]["control"] += v["control"]
    settings = []
    for (p, m), v in sorted(pooled.items()):
        s = {"back_penalty": p, "ctc_margin": m, **summarise(v["repeat"], v["control"])}
        settings.append(s)
        print(json.dumps(s))
    if args.record:
        frozen = [x for x in settings if x["back_penalty"] == PARAMS["BACK_PENALTY"]
                  and x["ctc_margin"] == PARAMS["CTC_MARGIN"]]
        chosen = frozen[0] if frozen else best(settings)  # the record describes the parameters that ship
        record = {"tool_version": tool_version(), "params_digest": params_digest(), "code_digest": code_digest(),
                  "repeat_mode": PARAMS["REPEAT_MODE"],
                  "date": datetime.date.today().isoformat(), "surahs": args.surah, **chosen,
                  "settings": settings, "targets": TARGETS}
        body = json.loads(args.out.read_text(encoding="utf-8")) if args.out.is_file() else {"schema": 1, "records": []}
        body["records"].append(record)
        args.out.write_text(json.dumps(body, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
