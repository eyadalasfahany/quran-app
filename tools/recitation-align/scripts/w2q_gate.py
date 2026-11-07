"""Way2Quran gate (ADR 0077 decision 5, plan way2quran-quality Q6a).

  w2q_gate.py --reciter ID --surah N ... --audio-dir DIR --aligned-dir DIR --completeness-dir DIR
              --refused-dir DIR --asr-dir DIR --out-dir DIR [--pauses-dir DIR] [--tanzil FILE] [--batch N]

For every surah of the chunk it writes `OUT/NNN.json`, a gate record (report.py `validate_gate`):
- completeness is not `complete`: `unavailable` (G0), nothing else runs;
- a refusal record exists: `no_highlight` (G1), nothing else runs;
- otherwise the G3 ayah-start probes, the G4 screen and G2 end coverage run on the aligned document, and
  `gate.surah_verdict` decides. In Q6a anything that needs repair is `no_highlight` (`needs-repair`).

It also writes `OUT/available-surahs.json`: the surahs whose verdict is not `unavailable`. The workflow's upload
step reads that list, so an `unavailable` file never reaches R2 (P1); `no_highlight` surahs still upload.

`--asr-dir` is accepted for symmetry with the other quality scripts: the gate's clips are short and are not
cached. Exit code: 0 when every surah got a record; non-zero on a tool error (missing or mismatched input).
"""

import argparse
import json
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


def gate_surah(surah: int, comp: dict, *, doc: dict | None, refusal: dict | None, ayahs: dict, wav, transcribe_clips,
               pauses=None, batch: int = 1) -> dict:
    """The gate record of one surah. `wav` is only read when probes run (a callable returning the samples is
    accepted, so a G0 or G1 surah never decodes its audio)."""
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
    return gate.surah_verdict(
        surah, comp, words=words, anchors=anchors, g2=g2, g4=g4, pauses=pauses,
        g3={"results": results, "unprobed": probes["unprobed"], "moved": probes["moved"]},
        seconds={"g3": round(t_g3, 1), "g4": round(t_g4, 1), "g2": round(t_g2, 1)})


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
                wav=lambda s=surah: load_wav16k(args.audio_dir / f"{s:03d}.mp3"), pauses=pauses, batch=args.batch)
        except GateInputError as err:
            print(str(err), file=sys.stderr)
            return 2
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
