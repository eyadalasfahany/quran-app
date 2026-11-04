"""Command line entry point: `recitation-align run AUDIO --tanzil PATH [--surah N] [--out OUT.json]`."""

import argparse
import json
import sys
import time
from pathlib import Path

from . import __version__
from .align import align
from .audio import file_sha256, load_wav16k
from .identify import covered_ayahs, identify_surah
from .models import ALIGN_MODEL, ALIGN_REVISION, ASR_MODEL, ASR_REVISION, SAMPLE_RATE
from .text import load_tanzil

TOOL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
DEFAULT_OUT_DIR = Path("out")


def _ts(ms: int) -> str:
    return f"{ms // 60000}:{ms % 60000 / 1000:05.2f}"


def print_summary(words: list[dict]) -> None:
    print("per-ayah:")
    basmala = [w for w in words if w["basmala"]]
    groups = [("basmala", basmala)] if basmala else []
    for a in sorted({w["ayah"] for w in words}):
        ws = [w for w in words if w["ayah"] == a and not w["basmala"]]
        if ws:
            groups.append((f"{words[0]['surah']}:{a}", ws))
    for label, ws in groups:
        conf = sum(w["confidence"] for w in ws) / len(ws)
        print(f"  {label:<8} {_ts(ws[0]['start_ms'])} → {_ts(ws[-1]['end_ms'])}  "
              f"conf {conf:.2f}  {ws[0]['word']} … {ws[-1]['word']}")


def _run(args: argparse.Namespace) -> int:
    if not args.audio.is_file():
        print(f"error: audio file not found: {args.audio}", file=sys.stderr)
        return 2
    if not args.tanzil.is_file():
        print(f"error: Tanzil text not found: {args.tanzil}", file=sys.stderr)
        return 2
    ayahs = load_tanzil(args.tanzil)
    if not ayahs:
        print(f"error: no ayahs parsed from {args.tanzil}", file=sys.stderr)
        return 2

    t0 = time.time()
    wav = load_wav16k(args.audio)
    duration_ms = round(len(wav) / SAMPLE_RATE * 1000)

    identify = None
    asr_model = None
    if args.surah is not None:
        if args.surah not in {s for s, _ in ayahs}:
            print(f"error: surah {args.surah} is not in the Tanzil text", file=sys.stderr)
            return 2
        surah = args.surah
    else:
        from .transcribe import transcribe  # imports torch; only the ASR path needs it

        asr = transcribe(wav)
        surah, score, candidates = identify_surah(asr["text"], ayahs)
        covered = covered_ayahs(asr["text"], ayahs, surah)
        print(f"surah candidates: {candidates}")
        print(f"surah {surah}: {len(covered)}/{len({a for s, a in ayahs if s == surah})} ayahs found in transcript")
        identify = {"score": score, "candidates": candidates}
        asr_model = {"id": ASR_MODEL, "revision": ASR_REVISION}

    words = align(wav, surah, ayahs)
    print(f"aligned {len(words)} words in {time.time() - t0:.1f}s")
    print_summary(words)

    out = args.out or DEFAULT_OUT_DIR / f"{args.audio.stem}.json"
    result = {
        "tool_version": __version__,
        "asr_model": asr_model,
        "align_model": {"id": ALIGN_MODEL, "revision": ALIGN_REVISION},
        "audio": {
            "file": args.audio.name,
            "bytes": args.audio.stat().st_size,
            "sha256": file_sha256(args.audio),
            "duration_ms": duration_ms,
        },
        "surah": surah,
        "identify": identify,
        "words": words,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="recitation-align",
        description="Local dev tool: word timings for a recitation file. Never runs on the server (ADR 0052).",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="align one audio file")
    run.add_argument("audio", type=Path, help="recitation file (mp3, wav, or any ffmpeg input)")
    run.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL,
                     help="Tanzil simple text (default: packages/quran-text-check data)")
    run.add_argument("--surah", type=int, default=None,
                     help="surah number (1-114); skips speech recognition")
    run.add_argument("--out", type=Path, default=None,
                     help="output JSON (default: out/<audio name>.json in the current folder)")
    run.set_defaults(func=_run)

    args = parser.parse_args(argv)
    if args.surah is not None and not 1 <= args.surah <= 114:
        parser.error("--surah must be between 1 and 114")
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
