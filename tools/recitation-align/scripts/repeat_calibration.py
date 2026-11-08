"""Repeat calibration on QF Afasy (plan way2quran-quality Q7c, ADR 0077 decision 4). Local or CI.

    repeat_calibration.py [--surah 1 2 18 36 59] [--penalty 30 ...] [--confirm total none] [--control-every 3]
                          [--ref-dir DIR --audio-dir DIR --cache-dir DIR] [--raw FILE]
                          [--out checks/repeat-calibration.json] [--record]
    repeat_calibration.py --merge RAW ... [--out FILE] [--record]     (CI: the surahs ran in parallel jobs)

The repeat stage is run alone, ayah by ayah, on the QF Afasy audio (`out/audio/qf-afasy/NNN.mp3`), against QF's word
segments (`out/a6/ref/qf-NNN.json`, gitignored QF data):

- the region of an ayah is QF's own ayah span, so the stage is measured apart from the anchors and the aligner;
- the gate's own path (Q7g): the CTC repeat proposer over the emissions (`repeats.propose`, cached in
  `out/a6/repeat-cache/`) at each `--penalty` (VITERBI_PENALTY), the per-jump total log-prob confirm
  (`confirm_jumps(score="total")`, or none), the re-align (`realign_region`) and the export mapping
  (`export.map_segments`, what ships). No ASR;
- repeat ayahs are QF's ayahs with a repeated position. Control ayahs are all the others in 1, 18, 36 and 59, and
  every `--control-every`-th of 2.

Metrics (targets from the plan): `reproduced_share`, the share of QF's repeat occurrences (a position recited again
inside its ayah) that come out as the same position at the same place in the sequence (>= 0.90); `median_ms` and
`p90_ms` of the start error on those occurrences (<= 60 and <= 150); `false_repeats`, control ayahs that come out with
a repeated position (0). The pass is judged on back-jumps (a position recited after a later one); same-word-only
repeats are reported apart. `lit_agree` is the share of 20 ms samples where the word lit by the app's rule (the one
that started last) is QF's, per kind. Only numbers and verse counts are written: no QF text, no QF timings.

With `--record`, the setting of the frozen PARAMS is appended to the calibration record with the whole sweep. `passed`
is the 8 Nov 2026 amendment's target: back-jumps reproduced >= 90% and 0 false repeats. Timing is reported, not
gated. `passed` false keeps REPEAT_MODE "null" (P14). In CI (`.github/workflows/recitation-check.yml`) the references
come from `qf_ref_fetch.py` at run time and only the numbers leave the runner.
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
sys.path.insert(0, str(TOOL / "scripts"))

from lit_word import agreement  # noqa: E402  (the app's lit-word rule, shared with recitation_check.py)

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

def _emissions(n: int, wav, cache_dir: Path):
    from recitation_align.align import compute_emissions, load_emissions, save_emissions

    path = cache_dir / f"qf-{n:03d}.npz"
    key = f"qf-afasy-{n:03d}|{len(wav)}"
    em = load_emissions(path, key)
    if em is None:
        em = compute_emissions(wav)
        save_emissions(path, key, em)
    return em


def kind_of(ref_words: list[dict]) -> str:
    """`back-jump`, `same-word-only` (QF's repeat is only a word twice in a row) or `control`."""
    idx = [w["index"] for w in sorted(ref_words, key=lambda w: w["start_ms"])]
    if len(set(idx)) == len(idx):
        return "control"
    return "back-jump" if any(b < a for a, b in zip(idx, idx[1:])) else "same-word-only"


def run_surah(n: int, ayahs: dict, vocab: dict, blank: int, penalties, confirms, control_every: int,
              ref_dir: Path = REF_DIR, audio_dir: Path = AUDIO_DIR, cache_dir: Path = CACHE_DIR) -> dict:
    """{(penalty, confirm): {"repeat", "control", "lit"}} for one surah, through the gate's own path (Q7g): the region
    is the ayah (QF's span), `repeats.propose` reads the sequence from the emissions, `confirm_jumps(score="total")`
    checks each jump (or not, with confirm "none"), `realign_region` aligns it and `export.map_segments` maps it."""
    from recitation_align import repeats as rp
    from recitation_align.audio import load_wav16k
    from recitation_align.export import map_segments

    refs = json.loads((ref_dir / f"qf-{n:03d}.json").read_text(encoding="utf-8"))
    wav = load_wav16k(audio_dir / f"{n:03d}.mp3")
    em = _emissions(n, wav, cache_dir)
    spf = len(wav) / 16000 / em.shape[0]
    out = {(p, c): {"repeat": [], "control": [], "kinds": [], "lit": {}} for p in penalties for c in confirms}
    controls = [r for r in refs if r["words"] and not is_repeat(r["words"])]
    controls = controls if n != 2 else controls[::control_every]
    chosen = [(r, "repeat") for r in refs if r["words"] and is_repeat(r["words"])] + [(r, "control") for r in controls]
    for ref, kind in chosen:
        a = ref["ayah"]
        f0, f1 = max(0, round(ref["start_ms"] / 1000 / spf)), min(em.shape[0], round(ref["end_ms"] / 1000 / spf))
        rt = rp.region_text(n, ayahs, a, a, vocab, f0=f0, f1=f1, spf=spf)
        if not rt.sw:
            continue
        sub = kind_of(ref["words"])
        for p in penalties:
            seq = rp.propose(em, rt, (f0, f1), blank, p)
            for c in confirms:
                final = rp.confirm_jumps(em, rt, seq, blank, score="total")[0] if c == "total" else seq
                try:
                    words = rp.realign_region(em, rt, final, blank)
                except (RuntimeError, ValueError):
                    words = []
                ours = map_segments(sorted(words, key=lambda w: w["start_ms"])) if words else []
                cell = out[(p, c)]
                cell[kind].append(compare(ours, ref["words"]))
                if kind == "repeat":
                    cell["kinds"].append(sub)
                agree, total = agreement(ours, ref)
                acc = cell["lit"].setdefault(sub, [0, 0])
                acc[0] += agree
                acc[1] += total
        print(f"{n}:{a} {kind} done", file=sys.stderr, flush=True)
    return out


def pool(runs: list[dict]) -> dict:
    """The per-surah results of `run_surah` pooled by setting."""
    pooled: dict = {}
    for run in runs:
        for k, v in run.items():
            cell = pooled.setdefault(k, {"repeat": [], "control": [], "kinds": [], "lit": {}})
            for f in ("repeat", "control", "kinds"):
                cell[f] += v[f]
            for sub, (a, t) in v["lit"].items():
                acc = cell["lit"].setdefault(sub, [0, 0])
                acc[0] += a
                acc[1] += t
    return pooled


def _measured(repeat_results: list[dict], control_results: list[dict]) -> dict:
    """`summarise` without its own `passed`: since the amendment of 8 Nov 2026 timing is reported, not gated."""
    return {k: v for k, v in summarise(repeat_results, control_results).items() if k != "passed"}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--surah", type=int, nargs="*", default=SURAHS)
    ap.add_argument("--penalty", type=float, nargs="*", default=None, help="VITERBI_PENALTY values (default PARAMS)")
    ap.add_argument("--confirm", nargs="*", default=["total"], choices=["total", "none"],
                    help="check each proposed jump by total log-prob (the gate), or not")
    ap.add_argument("--control-every", type=int, default=3)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--record", action="store_true", help="append the chosen setting to the calibration record")
    ap.add_argument("--ref-dir", type=Path, default=REF_DIR, help="qf-NNN.json references (CI: qf_ref_fetch.py)")
    ap.add_argument("--audio-dir", type=Path, default=AUDIO_DIR)
    ap.add_argument("--cache-dir", type=Path, default=CACHE_DIR)
    ap.add_argument("--raw", type=Path, help="also write the per-ayah results (numbers only) for a later --merge")
    ap.add_argument("--merge", type=Path, nargs="*", help="pool earlier --raw files instead of running the models")
    args = ap.parse_args(argv)

    from recitation_align.quality import PARAMS, code_digest, params_digest, tool_version

    if args.merge:
        parts = [json.loads(p.read_text(encoding="utf-8")) for p in args.merge]
        surahs = sorted(n for part in parts for n in part["surahs"])
        runs = [{tuple(json.loads(k)): v for k, v in part["cells"].items()} for part in parts]
    else:
        from recitation_align.align import load_vocab
        from recitation_align.text import load_tanzil

        penalties = args.penalty or [PARAMS["VITERBI_PENALTY"]]
        ayahs = load_tanzil(TANZIL)
        vocab, blank = load_vocab()
        surahs = args.surah
        runs = [run_surah(n, ayahs, vocab, blank, penalties, args.confirm, args.control_every,
                          args.ref_dir, args.audio_dir, args.cache_dir) for n in surahs]
    pooled = pool(runs)
    if args.raw:
        args.raw.write_text(json.dumps({"surahs": surahs, "cells": {json.dumps(list(k)): v for k, v in pooled.items()}}),
                            encoding="utf-8")
    settings = []
    for (p, c), v in sorted(pooled.items()):
        back = [r for r, k in zip(v["repeat"], v["kinds"]) if k == "back-jump"]
        same = [r for r, k in zip(v["repeat"], v["kinds"]) if k == "same-word-only"]
        s = {"viterbi_penalty": p, "max_back": PARAMS["VITERBI_MAX_BACK"], "confirm": c,
             "back_jump": _measured(back, v["control"]),  # the target (ADR 0077 amendment of 8 Nov 2026)
             "all_repeats": _measured(v["repeat"], v["control"]),
             "same_word_only": {"ayahs": len(same), "exact_sequence": sum(r["exact"] for r in same),
                                "reproduced": sum(r["reproduced"] for r in same),
                                "occurrences": sum(r["repeat_occurrences"] for r in same)},
             "lit_agree": {k: round(a / t, 4) for k, (a, t) in sorted(v["lit"].items()) if t}}
        s["passed"] = s["back_jump"]["reproduced_share"] is not None and \
            s["back_jump"]["reproduced_share"] >= TARGETS["reproduced_share"] and s["back_jump"]["false_repeats"] == 0
        settings.append(s)
        print(json.dumps(s))
    if args.record:
        frozen = [x for x in settings if x["viterbi_penalty"] == PARAMS["VITERBI_PENALTY"] and x["confirm"] == "total"]
        chosen = frozen[0] if frozen else settings[0]  # the record describes the parameters that ship
        record = {"tool_version": tool_version(), "params_digest": params_digest(), "code_digest": code_digest(),
                  "repeat_mode": PARAMS["REPEAT_MODE"], "proposer": "viterbi_repeats",
                  "date": datetime.date.today().isoformat(), "surahs": surahs, **chosen,
                  "settings": settings, "targets": TARGETS}
        body = json.loads(args.out.read_text(encoding="utf-8")) if args.out.is_file() else {"schema": 1, "records": []}
        body["records"].append(record)
        args.out.write_text(json.dumps(body, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
