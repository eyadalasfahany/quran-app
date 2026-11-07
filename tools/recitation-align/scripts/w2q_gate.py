"""Way2Quran gate (ADR 0077 decision 5, plan way2quran-quality Q6a).

  w2q_gate.py --reciter ID --surah N ... --audio-dir DIR --aligned-dir DIR --completeness-dir DIR
              --refused-dir DIR --asr-dir DIR --out-dir DIR [--pauses-dir DIR] [--tanzil FILE] [--batch N]

For every surah of the chunk it writes `OUT/NNN.json`, a gate record (report.py `validate_gate`):
- completeness is not `complete`: `unavailable` (G0), nothing else runs;
- a refusal record exists: `no_highlight` (G1), nothing else runs;
- otherwise the G3 ayah-start probes, the G4 screen and G2 end coverage run on the aligned document, and
  `gate.surah_verdict` decides. A surah that needs repair goes through the repair stage (plan Q7b): repeat
  detection, dense ASR, the recited sequence, the CTC confirm and re-align, or stepped probes for a late or early
  start, then the re-probe and the final verdict (`repaired` when a repair was accepted, `no_highlight` with reason
  `repair-failed` when a failure is left, `unavailable` (`incomplete-middle`) when GAP_G3_RUN or more consecutive
  G3 failures are left).

A `repaired` surah's aligned document is rewritten in place: its words sorted by (ayah, start_ms), its `ayahs`
spans recomputed and a `repairs` key added (the export ignores it). Gating that document again does not repair it
again: its words are gated as they are, and its `repairs` are carried into the record.

The repair stage reads the emissions cache (`--emissions-dir`, default the pilot's `out/emissions`, file
`way2quran-ID-NNN.npz` checked against the audio sha256; computed when missing) and writes the dense ASR into the
`dense` key of `asr/NNN.json`. Nothing of it is loaded for a surah that needs no repair.

It also writes `OUT/available-surahs.json`: the surahs whose verdict is not `unavailable`. The workflow's upload
step reads that list, so an `unavailable` file never reaches R2 (P1); `no_highlight` surahs still upload.

The G3 and G4 clips are short and are not cached. Exit code: 0 when every surah got a record; non-zero on a tool
error (missing or mismatched input).
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOL_DIR))

from recitation_align import gate  # noqa: E402
from recitation_align.anchors import usable_ayahs  # noqa: E402
from recitation_align.report import validate_completeness, validate_gate, validate_refusal  # noqa: E402
from recitation_align.text import load_tanzil  # noqa: E402

DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()


class GateInputError(Exception):
    """A missing or mismatched input: a tool error, not a verdict."""


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def ayah_spans(words: list[dict], duration_ms: int, previous: list[dict]) -> list[dict]:
    """The aligned document's `ayahs` spans from its words (as `pilot_published.ayah_spans`), keeping each span's
    `source`."""
    firsts: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            firsts[w["ayah"]] = min(firsts.get(w["ayah"], w["start_ms"]), w["start_ms"])
    order = sorted(firsts)
    source = {a["ayah"]: a.get("source") for a in previous}
    return [{"ayah": a, "start_ms": firsts[a], "end_ms": firsts[order[i + 1]] if i + 1 < len(order) else duration_ms,
             "source": source.get(a)} for i, a in enumerate(order)]


def gate_surah(surah: int, comp: dict, *, doc: dict | None, refusal: dict | None, ayahs: dict, wav, transcribe_clips,
               pauses=None, batch: int = 1, repair=None) -> dict:
    """The gate record of one surah. `wav` is only read when probes run (a callable returning the samples is
    accepted, so a G0 or G1 surah never decodes its audio).

    `repair`, when given, is a callable `repair(samples) -> {"em", "vocab", "blank", "dense"}` (the emissions,
    the align vocabulary and a dense-ASR function), called only when the first pass needs repair. A repaired
    document is updated in place (words, `ayahs`, `repairs`); the caller writes it back."""
    if comp["verdict"] != "complete" or refusal is not None:
        return gate.surah_verdict(surah, comp, refusal=refusal)
    if doc is None:
        raise GateInputError(f"surah {surah}: complete, not refused, but there is no aligned document")
    if doc["audio"]["sha256"] != comp["sha256"]:
        raise GateInputError(f"surah {surah}: the aligned document is of another file (sha256 differs)")
    words = doc["words"]
    anchors = doc.get("anchors")
    if anchors is None:
        raise GateInputError(f"surah {surah}: the aligned document has no anchors (not a quality run)")
    samples = wav() if callable(wav) else wav
    duration_s = doc["audio"]["duration_ms"] / 1000
    cuts = [ms / 1000 for _, ms in anchors.get("cuts", [])]
    usable = usable_ayahs(surah, ayahs)

    t0 = time.perf_counter()
    probes = gate.probe_ayah_starts(samples, words, surah, ayahs, transcribe_clips, cuts, batch=batch)
    results = gate.refrain_resolve(probes["probes"], usable)
    t_g3 = time.perf_counter() - t0
    t0 = time.perf_counter()
    g4 = gate.word_onset_probes(samples, words, transcribe_clips, f"{comp['sha256']}:{surah}", batch=batch)
    t_g4 = time.perf_counter() - t0
    t0 = time.perf_counter()
    g2 = gate.end_coverage(samples, words, surah, ayahs, transcribe_clips, probes["probes"], comp, duration_s,
                           batch=batch)
    t_g2 = time.perf_counter() - t0
    seconds = {"g3": round(t_g3, 1), "g4": round(t_g4, 1), "g2": round(t_g2, 1)}
    g3 = {"results": results, "unprobed": probes["unprobed"], "moved": probes["moved"]}
    prior = doc.get("repairs")
    if prior:
        # an already repaired document: gated as it is, its repairs carried (no second repair)
        null = sorted({a for r in prior if r.get("accepted") for a in r.get("null", [])})
        cross = [c for r in prior if r.get("accepted") for c in r.get("cross", [])]
        return gate.surah_verdict(surah, comp, words=words, anchors=anchors, g2=g2, g4=g4, pauses=pauses, g3=g3,
                                  seconds=seconds, repairs=prior, repair_null=null, cross_ayah=cross)
    first = gate.surah_verdict(surah, comp, words=words, anchors=anchors, g2=g2, g4=g4, pauses=pauses, g3=g3,
                               seconds=seconds)
    if repair is None or first["verdict"] != "no_highlight" or first["reasons"] != ["needs-repair"]:
        return first

    t0 = time.perf_counter()
    tools = repair(samples)
    em = tools["em"]
    ctx = gate.RepairContext(
        surah=surah, ayahs=ayahs, wav=samples, em=em, vocab=tools["vocab"], blank=tools["blank"],
        spf=duration_of(samples, duration_s) / em.shape[0], transcribe_clips=transcribe_clips, dense=tools["dense"],
        completeness=comp, duration_s=duration_s, anchors=anchors, usable=usable, cuts=tuple(cuts), pauses=pauses,
        pace=gate.surah_pace(words), batch=batch)
    out = gate.run_repairs(ctx, words, probes["probes"], first)
    final_results = gate.refrain_resolve(out["raw"], usable)
    seconds["repair"] = round(time.perf_counter() - t0, 1)
    record = gate.surah_verdict(
        surah, comp, words=out["words"], anchors=anchors, g2=out["g2"] or g2, g4=g4, pauses=pauses,
        g3={"results": final_results, "unprobed": probes["unprobed"], "moved": probes["moved"]}, seconds=seconds,
        repairs=out["repairs"], repair_null=out["null"], cross_ayah=out["cross"])
    if record["verdict"] == "repaired":
        doc["words"] = sorted(out["words"], key=lambda w: (w["ayah"], w["start_ms"]))
        doc["ayahs"] = ayah_spans(doc["words"], doc["audio"]["duration_ms"], doc.get("ayahs", []))
        doc["repairs"] = out["repairs"]
    return record


def duration_of(samples, fallback_s: float) -> float:
    """Seconds of audio: the decoded samples when there are any (the time base `run_anchored` uses)."""
    try:
        return len(samples) / 16000 if len(samples) else fallback_s
    except TypeError:
        return fallback_s


def dense_asr(wav, sha: str, cache_path: Path, transcribe_clips):
    """A dense-ASR function for the repair stage: windows cached under `dense` in the ASR cache `asr/NNN.json`
    (the same key as `cached_transcribe_at`; other keys are kept). The file is written atomically."""
    from recitation_align.transcribe import _window_key, transcription_key_at

    key = transcription_key_at(sha)

    def run(windows):
        body = {}
        if cache_path is not None and cache_path.is_file():
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            if data.get("key") == key:
                body = data
        body.setdefault("key", key)
        body.setdefault("windows", {})
        dense = dict(body.get("dense", {}))
        missing = [w for w in windows if _window_key(*w) not in dense]
        if missing:
            for w, c in zip(missing, transcribe_clips(wav, missing)["clips"]):
                dense[_window_key(*w)] = c["text"]
            body["dense"] = dense
            if cache_path is not None:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                tmp = cache_path.with_name(cache_path.name + ".tmp")
                tmp.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
                os.replace(tmp, cache_path)
        return [dense[_window_key(*w)] for w in windows]

    return run


_VOCAB: dict = {}


def repair_tools(args, surah: int, sha: str, samples, transcribe_clips) -> dict:
    """The emissions (cache checked against the audio sha256, computed when missing), the align vocabulary and the
    cached dense-ASR function, for the repair stage of one surah."""
    from recitation_align.align import compute_emissions, emission_key, load_emissions, load_vocab, save_emissions

    path = args.emissions_dir / f"way2quran-{args.reciter}-{surah:03d}.npz"
    em = load_emissions(path, emission_key(sha))
    if em is None:
        em = compute_emissions(samples)
        save_emissions(path, emission_key(sha), em)
    if not _VOCAB:
        _VOCAB["vocab"], _VOCAB["blank"] = load_vocab()
    return {"em": em, "vocab": _VOCAB["vocab"], "blank": _VOCAB["blank"],
            "dense": dense_asr(samples, sha, args.asr_dir / f"{surah:03d}.json", transcribe_clips)}


def write_record(out_dir: Path, record: dict) -> None:
    validate_gate(record)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{record['surah']:03d}.json").write_text(
        json.dumps(record, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--reciter", type=int, required=True)
    p.add_argument("--surah", type=int, nargs="*", default=None)
    p.add_argument("--audio-dir", type=Path, required=True)
    p.add_argument("--aligned-dir", type=Path, required=True)
    p.add_argument("--completeness-dir", type=Path, required=True)
    p.add_argument("--refused-dir", type=Path, required=True)
    p.add_argument("--asr-dir", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--pauses-dir", type=Path, default=None)
    p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    p.add_argument("--batch", type=int, default=1, help="clips per Whisper call (1 until P10 adopts more)")
    p.add_argument("--emissions-dir", type=Path, default=TOOL_DIR / "out" / "emissions",
                   help="the align emissions cache (way2quran-ID-NNN.npz), read by the repair stage")
    args = p.parse_args(argv)

    surahs = sorted(set(args.surah)) if args.surah else sorted(
        int(q.stem) for q in args.completeness_dir.glob("[0-9][0-9][0-9].json"))
    ayahs = load_tanzil(args.tanzil)
    from recitation_align.audio import load_wav16k  # loads torch lazily; imported here for --help
    from recitation_align.transcribe import transcribe_clips

    available = []
    for surah in surahs:
        name = f"{surah:03d}.json"
        comp_path = args.completeness_dir / name
        if not comp_path.is_file():
            print(f"surah {surah}: no completeness record in {args.completeness_dir}", file=sys.stderr)
            return 2
        comp = _load(comp_path)
        validate_completeness(comp)
        refusal = _load(args.refused_dir / name) if (args.refused_dir / name).is_file() else None
        if refusal is not None:
            validate_refusal(refusal)
        doc = _load(args.aligned_dir / name) if (args.aligned_dir / name).is_file() else None
        pauses = None
        if args.pauses_dir is not None and (args.pauses_dir / f"{surah:03d}.pauses.json").is_file():
            pauses = _load(args.pauses_dir / f"{surah:03d}.pauses.json")["pauses"]
        try:
            record = gate_surah(
                surah, comp, doc=doc, refusal=refusal, ayahs=ayahs, transcribe_clips=transcribe_clips,
                wav=lambda s=surah: load_wav16k(args.audio_dir / f"{s:03d}.mp3"), pauses=pauses, batch=args.batch,
                repair=lambda samples, s=surah, c=comp: repair_tools(args, s, c["sha256"], samples, transcribe_clips))
        except GateInputError as err:
            print(str(err), file=sys.stderr)
            return 2
        if record["verdict"] == "repaired" and "repair" in record["seconds"]:  # repaired in this run
            (args.aligned_dir / name).write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                                                 encoding="utf-8")
        write_record(args.out_dir, record)
        if record["verdict"] != "unavailable":
            available.append(surah)
        c = record["checks"]
        print(f"surah {surah}: {record['verdict']} {','.join(record['reasons']) or '-'} "
              f"G3 {c['G3'].get('ok', '-')}/{c['G3'].get('n', '-')} G5 {c['G5'].get('status')} "
              f"stretch {len(c['stretch'].get('words', []))} {record['seconds']}", flush=True)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "available-surahs.json").write_text(json.dumps(available) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
