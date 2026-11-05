"""Command line entry point: `recitation-align run AUDIO --tanzil PATH [--surah N] [--out OUT.json]`."""

import argparse
import json
import sys
import time
from pathlib import Path

from . import __version__
from .align import (LOOKAHEAD_TOKENS, MAX_TOKENS, SLACK, STAR_PENALTY, align_full, compute_emissions,
                    emission_key, load_emissions, load_vocab, save_emissions)
from .anchors import ayah_anchors
from .apply_marks import apply_marks_dir, apply_surah_marks, manual_marks_list, ms_per_frame
from .audio import file_sha256, load_wav16k
from .identify import covered_ayahs, identify_surah
from .marks import MOSHAF_DEFAULT, load_marks, reviewed_ranges, surah_marks
from .pauses import DEFAULT_MIN_SILENCE_S, DEFAULT_NOISE_DB, cached_pauses
from .repair import repair_surah
from .review import build_review_list, format_ms, read_surah_files, write_review_list
from .review_server import DEFAULT_PORT, serve
from .snap import SNAP_WINDOW_MS, snap_to_pauses
from .models import ALIGN_MODEL, ALIGN_REVISION, ASR_MODEL, ASR_REVISION, SAMPLE_RATE
from .text import load_tanzil

TOOL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
DEFAULT_UTHMANI = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt").resolve()
DEFAULT_OUT_DIR = Path("out")
DEFAULT_AUDIO_DIR = DEFAULT_OUT_DIR / "audio" / "mp3quran-253"
DEFAULT_EMISSIONS_DIR = DEFAULT_OUT_DIR / "emissions"
DEFAULT_MARKS = DEFAULT_OUT_DIR / "253-marks.json"
DEFAULT_REVIEW = DEFAULT_OUT_DIR / "253-review.json"
DEFAULT_SETTINGS = dict(max_tokens=MAX_TOKENS, lookahead_tokens=LOOKAHEAD_TOKENS, slack=SLACK,
                        star_penalty=STAR_PENALTY)


def _ts(ms: int) -> str:
    return f"{ms // 60000}:{ms % 60000 / 1000:05.2f}"


def print_summary(words: list[dict]) -> None:
    print("per-ayah:")
    basmala = [w for w in words if w.get("basmala")]
    groups = [("basmala", basmala)] if basmala else []
    for a in sorted({w["ayah"] for w in words}):
        ws = [w for w in words if w["ayah"] == a and not w.get("basmala")]
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

    em = None
    if args.emissions_cache is not None:
        key = emission_key(file_sha256(args.audio), args.overlap_emissions)
        em = load_emissions(args.emissions_cache, key)
        if em is None:
            em = compute_emissions(wav, overlap=args.overlap_emissions)
            save_emissions(args.emissions_cache, key, em)
            print(f"saved emissions to {args.emissions_cache}")
    if em is None:
        em = compute_emissions(wav, overlap=args.overlap_emissions)
    audio_sha = file_sha256(args.audio)
    pause_cache = args.emissions_cache.with_suffix(".pauses.json") if args.emissions_cache else None
    pauses = cached_pauses(args.audio, audio_sha, pause_cache, args.pause_noise_db, args.pause_min_s)
    anchors = None
    if args.anchors:
        from .transcribe import cached_transcribe  # imports torch; only the anchored path needs it

        asr_cache = (args.emissions_cache.parent.parent / "asr" / f"{args.emissions_cache.stem}.json"
                     if args.emissions_cache else DEFAULT_OUT_DIR / "asr" / f"{args.audio.stem}.json")
        asr = cached_transcribe(wav, audio_sha, asr_cache)
        anchors = ayah_anchors(asr["chunks"], args.surah if args.surah is not None else surah, ayahs)
        print(f"anchors: {len(anchors)} ayahs anchored to the transcript")
    words, basmala_recited, _decision = align_full(
        wav, surah, ayahs, max_tokens=args.max_tokens, em=em,
        lookahead_tokens=args.lookahead_tokens, slack=args.slack, star_penalty=args.star_penalty,
        leading_star=not args.no_leading_star, basmala=args.basmala, anchors=anchors, pauses=pauses)
    print(f"aligned {len(words)} words in {time.time() - t0:.1f}s")
    print_summary(words)

    if not args.no_snap:
        boundaries, changed = snap_to_pauses(words, pauses, window_ms=round(args.snap_window_s * 1000))
        print(f"snapped {boundaries} ayah boundaries to pauses ({changed} words changed)")

    repairs: list[dict] = []
    if not args.no_repair:
        words, repairs, asr_seconds = repair_surah(
            words, surah=surah, ayahs=ayahs, em=em, wav=wav, audio_sha=audio_sha, pauses=pauses,
            basmala_recited=basmala_recited, cache_dir=DEFAULT_OUT_DIR / "asr" / "spans",
            settings=dict(max_tokens=args.max_tokens, lookahead_tokens=args.lookahead_tokens,
                          slack=args.slack, star_penalty=args.star_penalty),
            log=lambda msg: print(msg, file=sys.stderr))
        accepted = sum(1 for r in repairs if r["status"] == "accepted")
        print(f"repairs: {len(repairs)} stretches, {accepted} accepted, ASR {asr_seconds:.0f}s")

    manual = None
    if args.marks is not None:
        marks = load_marks(args.marks)
        own = surah_marks(marks, surah)
        if own:
            words, ranges = apply_surah_marks(
                words, surah=surah, ayahs=ayahs, marks=own, reviewed=reviewed_ranges(marks, surah),
                em=em, mpf=ms_per_frame(duration_ms, em.shape[0]), vocab=load_vocab()[0],
                settings=DEFAULT_SETTINGS, pauses=pauses)
            manual = manual_marks_list(own)
            print(f"marks: {len(own)} ayah starts fixed, ranges re-aligned {ranges}")
        else:
            manual = []
            print(f"marks: none for surah {surah}")

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
        "basmala_recited": basmala_recited,
        "repairs": repairs,
        "identify": identify,
        "words": words,
    }
    if manual is not None:
        result["manual_marks"] = manual
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0


def _review_list(args: argparse.Namespace) -> int:
    if not args.tanzil.is_file():
        print(f"error: Tanzil text not found: {args.tanzil}", file=sys.stderr)
        return 2
    surah_data = read_surah_files(args.dir)
    if not surah_data:
        print(f"error: no NNN.json files in {args.dir}", file=sys.stderr)
        return 2
    data = build_review_list(surah_data, load_tanzil(args.tanzil), args.moshaf)
    write_review_list(args.out, data)
    counts = data["counts"]
    print(f"stretches: {counts['stretches']} (in {counts['surahs']} surahs)")
    print(f"ayahs: {counts['ayahs']}")
    for st in data["stretches"]:
        print(f"  {st['surah']:03d}:{st['lo']}-{st['hi']}  "
              f"window {format_ms(st['window']['start_ms'])} → {format_ms(st['window']['end_ms'])}")
    print(f"wrote {args.out}")
    return 0


def _review_serve(args: argparse.Namespace) -> int:
    try:
        serve(args.list, args.marks, args.audio_dir, args.port, args.words_dir)
    except (FileNotFoundError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


def _emissions_loader(audio_dir: Path, emissions_dir: Path, moshaf: str):
    """Per-surah emissions: reused from the cache when the audio and model match, else computed."""
    def load(surah: int):
        audio = audio_dir / f"{surah:03d}.mp3"
        key = emission_key(file_sha256(audio))
        cache = emissions_dir / f"{moshaf}-{surah:03d}.npz"
        em = load_emissions(cache, key)
        if em is None:
            em = compute_emissions(load_wav16k(audio))
            save_emissions(cache, key, em)
        return em
    return load


def _pauses_loader(audio_dir: Path, emissions_dir: Path, moshaf: str):
    """Per-surah pauses for snapping, cached next to the emissions (same names as the run cache)."""
    def load(surah: int):
        audio = audio_dir / f"{surah:03d}.mp3"
        return cached_pauses(audio, file_sha256(audio), emissions_dir / f"{moshaf}-{surah:03d}.pauses.json")
    return load


def _apply_marks(args: argparse.Namespace) -> int:
    try:
        marks = load_marks(args.marks)
    except ValueError as exc:
        print(f"error: marks file is not valid: {exc}", file=sys.stderr)
        return 2
    if not args.tanzil.is_file():
        print(f"error: Tanzil text not found: {args.tanzil}", file=sys.stderr)
        return 2
    ayahs = load_tanzil(args.tanzil)
    vocab, _ = load_vocab()
    try:
        summary = apply_marks_dir(
            args.dir, args.out, marks, ayahs=ayahs, vocab=vocab, settings=DEFAULT_SETTINGS,
            emissions_for=_emissions_loader(args.audio_dir, args.emissions_dir, args.moshaf),
            pauses_for=_pauses_loader(args.audio_dir, args.emissions_dir, args.moshaf))
    except (ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(f"surahs: {summary['surahs']} (copied unchanged: {summary['copied']}, changed: {summary['changed']})")
    print(f"marks applied: {summary['marks']}, ranges re-aligned: {summary['ranges']}")
    for item in summary["failed"]:
        print(f"failed: surah {item['surah']:03d} kept unchanged: {item['error']}", file=sys.stderr)
    if summary["missing"]:
        print(f"warning: marks for surahs with no file in {args.dir}: {summary['missing']}")
    print(f"wrote {args.out}")
    return 1 if summary["failed"] else 0


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
    run.add_argument("--max-tokens", type=int, default=MAX_TOKENS,
                     help=f"committed tokens per alignment window (default {MAX_TOKENS}); lower it to test windowing")
    run.add_argument("--lookahead-tokens", type=int, default=LOOKAHEAD_TOKENS,
                     help=f"look-ahead grows by whole ayahs until it holds this many tokens (default {LOOKAHEAD_TOKENS}: one ayah)")
    run.add_argument("--slack", type=float, default=SLACK,
                     help=f"window audio = aligned tokens x frames per token x slack + 10 s (default {SLACK})")
    run.add_argument("--star-penalty", type=float, default=STAR_PENALTY,
                     help=f"star log-prob = per-frame best label minus this (default {STAR_PENALTY})")
    run.add_argument("--emissions-cache", type=Path, default=None,
                     help="npz file with the model's log-probs; reused when the audio and model match")
    run.add_argument("--basmala", choices=["auto", "recited", "omitted"], default="auto",
                     help="basmala at the start of the file: decide per file (auto, default), or force")
    run.add_argument("--no-leading-star", action="store_true",
                     help="no star before the first word (reproduces the earlier windows)")
    run.add_argument("--anchors", action="store_true",
                     help="re-align ayahs the first pass places outside their ASR interval (off by default: "
                          "it failed the surah 002 gate, see the change notes)")
    run.add_argument("--overlap-emissions", action="store_true",
                     help="experimental: 30 s model windows with 5 s context (failed the 059 and 002 gates)")
    run.add_argument("--no-repair", action="store_true",
                     help="skip the anomaly-triggered local repair (ASR on the stretches it finds)")
    run.add_argument("--no-snap", action="store_true",
                     help="skip snapping ayah boundaries to audio pauses")
    run.add_argument("--snap-window-s", type=float, default=SNAP_WINDOW_MS / 1000,
                     help=f"a pause must lie within this many seconds of an ayah boundary (default {SNAP_WINDOW_MS / 1000:g})")
    run.add_argument("--pause-noise-db", type=float, default=DEFAULT_NOISE_DB,
                     help=f"silencedetect noise threshold for snapping (default {DEFAULT_NOISE_DB})")
    run.add_argument("--pause-min-s", type=float, default=DEFAULT_MIN_SILENCE_S,
                     help=f"shortest pause for snapping, seconds (default {DEFAULT_MIN_SILENCE_S})")
    run.add_argument("--marks", type=Path, default=None,
                     help="ear marks JSON: fix the marked ayah starts and re-align their stretches")
    run.set_defaults(func=_run)

    review = sub.add_parser("review-list", help="list the doubtful stretches to review by ear")
    review.add_argument("--dir", type=Path, default=DEFAULT_OUT_DIR / "253-v7", help="folder of NNN.json files")
    review.add_argument("--out", type=Path, default=DEFAULT_REVIEW, help="review list JSON to write")
    review.add_argument("--tanzil", type=Path, default=DEFAULT_UTHMANI,
                        help="Tanzil text shown on the page (default: uthmani)")
    review.add_argument("--moshaf", default=MOSHAF_DEFAULT, help="MP3Quran moshaf id (default 253)")
    review.set_defaults(func=_review_list)

    serve_p = sub.add_parser("review-serve", help="serve the review page on 127.0.0.1")
    serve_p.add_argument("--list", type=Path, default=DEFAULT_REVIEW, help="review list JSON (review-list)")
    serve_p.add_argument("--marks", type=Path, default=DEFAULT_MARKS, help="marks JSON (created on first save)")
    serve_p.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO_DIR, help="folder of NNN.mp3 files")
    serve_p.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"port (default {DEFAULT_PORT})")
    serve_p.add_argument("--words-dir", type=Path, default=DEFAULT_OUT_DIR / "253-v7",
                         help="aligner output folder: token timings shown on the page")
    serve_p.set_defaults(func=_review_serve)

    apply_p = sub.add_parser("apply-marks", help="apply the ear marks to every surah file")
    apply_p.add_argument("--dir", type=Path, default=DEFAULT_OUT_DIR / "253-v7", help="input folder of NNN.json")
    apply_p.add_argument("--marks", type=Path, default=DEFAULT_MARKS, help="marks JSON")
    apply_p.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR / "253-v8", help="output folder (new)")
    apply_p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL,
                         help="Tanzil simple text, as the aligner used it")
    apply_p.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO_DIR, help="folder of NNN.mp3 files")
    apply_p.add_argument("--emissions-dir", type=Path, default=DEFAULT_EMISSIONS_DIR,
                         help="emissions cache folder (filled when missing)")
    apply_p.add_argument("--moshaf", default=MOSHAF_DEFAULT, help="moshaf id used in cache names (default 253)")
    apply_p.set_defaults(func=_apply_marks)

    args = parser.parse_args(argv)
    if args.command == "run" and args.surah is not None and not 1 <= args.surah <= 114:
        parser.error("--surah must be between 1 and 114")
    if args.command == "run" and args.max_tokens < 1:
        parser.error("--max-tokens must be at least 1")
    if args.command == "run" and args.lookahead_tokens < 0:
        parser.error("--lookahead-tokens must not be negative")
    if args.command == "run" and args.slack <= 0:
        parser.error("--slack must be positive")
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
