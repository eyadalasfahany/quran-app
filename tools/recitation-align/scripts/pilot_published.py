"""Published ayah timings as fixed marks; words aligned inside each published span (plan B6, pilot).

Usage (from tools/recitation-align):
    uv run python scripts/pilot_published.py --moshaf 86 --surah 1 --surah 18 ...

For each surah: read the published rows (`out/published/MOSHAF/raw-NNN.json`), normalise them to the QF
convention (`recitation_align.published`), then align the words of each ayah inside its own span
[start, next start) with the same forced aligner and window settings as `run`. Basmala is decided
per file as `align_full` does. The first word of every ayah is then set to its published start, and
the previous ayah's last word is clipped to end there (as `apply_marks.realign_range` does), so the
export derives the published starts. Output: aligner-shaped `out/published/MOSHAF/aligned/NNN.json`
with `source: "mp3quran_published"` on the ayah rows. Nothing committed; nothing under resources/.

With --fallback-aligner, a surah whose published timings are refused (they do not fit the audio file)
or that end more than a minute before the audio does (the file holds recitation they do not cover)
is aligned by the whole-surah aligner instead (as `run --no-repair`: windowed alignment, then ayah
boundaries snapped to pauses) and written with `source: "aligner"`. A surah whose published spans leave
many ayahs at low confidence (at least 5 and 5%) is also aligned by the aligner, which is kept only when
it leaves fewer. The printed line says FALLBACK.

Quality check (printed): share of published ayah starts (ayahs 2..N) within 1 s of an audio pause,
and ayahs whose words have a mean confidence below 0.4 (basmala excluded). Keys and counts only.
"""

import argparse
import json
import sys
from pathlib import Path

import torch

from recitation_align import __version__
from recitation_align.align import (LOOKAHEAD_TOKENS, MAX_TOKENS, MUQATTAAT, SLACK, STAR_PENALTY,
                                    _expand_muqattaat, _words, align_emissions, align_full, basmala_word_count,
                                    compute_emissions, decide_basmala, emission_key, load_emissions,
                                    load_vocab, save_emissions, surah_tokens)
from recitation_align.apply_marks import ms_per_frame
from recitation_align.audio import file_sha256, load_wav16k
from recitation_align.models import ALIGN_MODEL, ALIGN_REVISION
from recitation_align.pauses import DEFAULT_MIN_SILENCE_S, DEFAULT_NOISE_DB, cached_pauses
from recitation_align.published import Normalised, PublishedError, normalise
from recitation_align.snap import SNAP_WINDOW_MS, snap_to_pauses
from recitation_align.text import load_tanzil

TOOL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
INGEST_OUT = (TOOL_DIR / "../mp3quran-ingest/out").resolve()
SOURCE = "mp3quran_published"
FALLBACK_SOURCE = "aligner"
# Audio this far past the last published ayah end means the published timings miss part of the
# recitation (moshaf 86 surah 89 repeats ayahs 21-26; the timings stop 151 s before the file ends).
# Ordinary tails (closing silence) seen on moshaf 86 stay under 27 s.
MAX_UNPUBLISHED_TAIL_MS = 60_000
# Published spans that leave this many ayahs below LOW_CONFIDENCE are compared with the aligner.
MIN_LOW_FOR_RETRY = 5
RETRY_SHARE = 0.05
LOW_CONFIDENCE = 0.4
TOLERANCE_S = 1.0
SETTINGS = dict(max_tokens=MAX_TOKENS, lookahead_tokens=LOOKAHEAD_TOKENS, slack=SLACK, star_penalty=STAR_PENALTY)


class SurahRefused(Exception):
    """A surah that cannot be produced. Printed as a reason; the batch goes on."""


def distance_to_pauses(t: float, pauses: list[tuple[float, float]]) -> float:
    """Seconds from t to the nearest pause (0 when t is inside one). Same rule as scripts/pause_check.py."""
    best = float("inf")
    for s, e in pauses:
        best = min(best, 0.0 if s <= t <= e else min(abs(t - s), abs(t - e)))
    return best


def align_in_spans(surah: int, norm: Normalised, *, ayahs: dict, em: torch.Tensor, mpf: float,
                   vocab: dict, blank: int) -> tuple[list[dict], bool | None]:
    """Word entries aligned inside each published ayah span. Returns (words, basmala_recited or None)."""
    words = _words(surah, ayahs)
    _expand_muqattaat(surah, ayahs, words, MUQATTAAT)
    n_basmala = basmala_word_count(surah, ayahs)
    recited = None
    if n_basmala:
        with torch.inference_mode():
            recited = decide_basmala(em, words, vocab, n_basmala, blank, STAR_PENALTY)["recited"]

    frames = em.shape[0]
    out: list[dict] = []
    for a in sorted(norm.starts):
        f0 = round(norm.starts[a] / mpf)
        f1 = min(round(norm.ends[a] / mpf), frames)
        if f1 <= f0:
            raise SurahRefused(f"ayah {a} has no audio frames")
        sw, tokens, wot, aoww = surah_tokens(surah, ayahs, a, a, recited, vocab)
        if not tokens:
            raise SurahRefused(f"ayah {a} has no alignable tokens")
        agg = align_emissions(em[f0:f1], tokens, wot, aoww, blank, leading_star=(a == 1), **SETTINGS)
        if set(agg) != set(range(len(sw))):
            raise SurahRefused(f"ayah {a}: {len(agg)} of {len(sw)} words aligned")
        for wi, (ayah_no, pos, word, _key) in enumerate(sw):
            r = agg[wi]
            entry = {
                "surah": surah, "ayah": ayah_no, "position": pos, "word": word,
                "start_ms": round((r["start"] + f0) * mpf),
                "end_ms": round((r["end"] + 1 + f0) * mpf),
                "confidence": round(sum(r["score"]) / len(r["score"]), 3),
            }
            if recited is not None:
                entry["basmala"] = ayah_no == 1 and pos <= n_basmala and bool(recited)
            out.append(entry)
    return out, (None if recited is None else bool(recited))


def force_published_starts(words: list[dict], norm: Normalised) -> int:
    """Set each ayah's first spoken word to its published start; clip the ayah before it to end there.

    Returns the number of previous-ayah words that had to be squeezed to 1 ms because the aligner had
    placed them after the published start. Mutates `words`.
    """
    squeezed = 0
    spoken: dict[int, list[dict]] = {}
    for w in sorted(words, key=lambda w: (w["ayah"], w["position"])):
        if not w.get("basmala"):
            spoken.setdefault(w["ayah"], []).append(w)
    for a in sorted(norm.starts):
        if a == 1:
            continue
        cut = norm.starts[a]
        if a not in spoken:
            raise SurahRefused(f"ayah {a} has no spoken words")
        first = spoken[a][0]
        first["start_ms"] = cut
        first["end_ms"] = max(first["end_ms"], cut + 1)
        prev = spoken[a - 1][-1]
        prev["end_ms"] = min(prev["end_ms"], cut)
        if prev["start_ms"] >= prev["end_ms"]:
            prev["start_ms"] = max(0, prev["end_ms"] - 1)
            squeezed += 1
    return squeezed


def ayah_confidence(words: list[dict]) -> dict[int, float]:
    """Mean word confidence per ayah, basmala words excluded."""
    sums: dict[int, list[float]] = {}
    for w in words:
        if not w.get("basmala"):
            sums.setdefault(w["ayah"], []).append(w["confidence"])
    return {a: sum(v) / len(v) for a, v in sums.items()}


def load_entry(manifest: dict, moshaf: int, surah: int) -> dict:
    for item in manifest.get("moshafs", []):
        if str(item.get("moshaf_id")) == str(moshaf):
            for f in item.get("files", []):
                if f.get("surah") == surah:
                    return f
            raise SurahRefused(f"surah {surah} is not in the ingest manifest for moshaf {moshaf}")
    raise SurahRefused(f"moshaf {moshaf} is not in the ingest manifest")


def run_surah(surah: int, args, manifest: dict, ayahs: dict, vocab: dict, blank: int) -> dict:
    entry = load_entry(manifest, args.moshaf, surah)
    audio = args.audio_dir / f"{surah:03d}.mp3"
    if not audio.is_file():
        raise SurahRefused(f"audio not found: {audio.name}")
    sha = file_sha256(audio)
    if sha != entry["sha256"] or audio.stat().st_size != entry["bytes"]:
        raise SurahRefused("local audio does not match the ingest manifest (sha256 or bytes)")
    duration_ms = entry["duration_ms"]

    raw_path = args.raw_dir / f"raw-{surah}.json"
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    verse_count = sum(1 for s, _ in ayahs if s == surah)
    refusal = None
    try:
        norm = normalise(raw, surah=surah, verse_count=verse_count, duration_ms=duration_ms)
        refusal = published_refusal(norm, duration_ms)
    except PublishedError as err:
        refusal = f"published timings refused: {err}"
    if refusal and not args.fallback_aligner:
        raise SurahRefused(refusal)

    cache = args.emissions_dir / f"{args.moshaf}-{surah:03d}.npz"
    key = emission_key(sha)
    em = load_emissions(cache, key)
    wav = None
    if em is None:
        wav = load_wav16k(audio)
        em = compute_emissions(wav)
        save_emissions(cache, key, em)
    mpf = ms_per_frame(duration_ms, em.shape[0])
    pauses = cached_pauses(audio, sha, args.pauses_dir / f"{surah:03d}.pauses.json",
                           DEFAULT_NOISE_DB, DEFAULT_MIN_SILENCE_S)

    def run_aligner():
        nonlocal wav
        if wav is None:
            wav = load_wav16k(audio)
        found, rec, _decision = align_full(wav, surah, ayahs, em=em, pauses=pauses)
        snap_to_pauses(found, pauses, window_ms=SNAP_WINDOW_MS)
        found.sort(key=lambda w: (w["ayah"], w["position"]))
        return found, rec

    if not refusal:
        words, recited = align_in_spans(surah, norm, ayahs=ayahs, em=em, mpf=mpf, vocab=vocab, blank=blank)
        squeezed = force_published_starts(words, norm)
        words.sort(key=lambda w: (w["ayah"], w["position"]))
        if args.fallback_aligner and too_many_low(words):
            # Published spans that leave many ayahs at low confidence may have drifted from the file
            # (moshaf 62 surah 2: from ayah 179 on). Keep the aligner only when it does strictly better.
            try:
                alt, alt_recited = run_aligner()
            except RuntimeError as err:
                # The comparison is optional: when the aligner cannot fit the file (moshaf 12
                # surah 2: CTC targets longer than the frames), keep the published words.
                print(f"{surah:03d}: aligner comparison failed, keeping published spans ({err})",
                      file=sys.stderr)
                alt = None
            low_pub = low_count(words)
            low_alt = low_count(alt) if alt is not None else low_pub
            if low_alt < low_pub:
                refusal = (f"published spans leave {low_pub} ayahs below {LOW_CONFIDENCE}; "
                           f"the aligner leaves {low_alt}")
                words, recited = alt, alt_recited
    if refusal:
        if not words_from_aligner(refusal):
            words, recited = run_aligner()
        spans = ayah_spans(words, duration_ms)
        doc_source, squeezed, published = FALLBACK_SOURCE, 0, {"refused": refusal}
        ayah1_published, end_mismatch, dropped = None, None, None
    else:
        spans = {a: (norm.starts[a], norm.ends[a]) for a in sorted(norm.starts)}
        doc_source = SOURCE
        ayah1_published, end_mismatch, dropped = (norm.ayah1_published_start_ms, norm.end_mismatch,
                                                  norm.dropped_ayah0)
        published = {"ayah1_published_start_ms": ayah1_published,
                      "published_last_end_ms": norm.published_last_end_ms,
                      "end_mismatch": end_mismatch, "dropped_ayah0": dropped,
                      "words_squeezed": squeezed}

    doc = {
        "surah": surah,
        "tool_version": __version__,
        "align_model": {"id": ALIGN_MODEL, "revision": ALIGN_REVISION},
        "audio": {"file": audio.name, "bytes": entry["bytes"], "sha256": entry["sha256"],
                  "duration_ms": duration_ms},
        "source": doc_source,
        "basmala_recited": recited,
        "published": published,
        "ayahs": [{"ayah": a, "start_ms": spans[a][0], "end_ms": spans[a][1], "source": doc_source}
                  for a in sorted(spans)],
        "words": words,
    }
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / f"{surah:03d}.json").write_text(
        json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    starts_s = [spans[a][0] / 1000 for a in sorted(spans) if a >= 2]
    within = sum(distance_to_pauses(t, pauses) <= TOLERANCE_S for t in starts_s)
    conf = ayah_confidence(words)
    low = sorted(a for a, c in conf.items() if c < LOW_CONFIDENCE)
    first_spoken = min((w["start_ms"] for w in words if w["ayah"] == 1 and not w.get("basmala")), default=None)
    return {
        "surah": surah, "ayahs": len(spans), "words": len(words), "recited": recited,
        "pauses": len(pauses), "starts_checked": len(starts_s), "within_1s": within,
        "low_conf_ayahs": low, "words_squeezed": squeezed, "dropped_ayah0": dropped,
        "end_mismatch": end_mismatch, "ayah1_first_word_ms": first_spoken,
        "ayah1_published_start_ms": ayah1_published, "duration_ms": duration_ms,
        "fallback": refusal,
    }


def low_count(words: list[dict]) -> int:
    """Ayahs whose mean word confidence is below LOW_CONFIDENCE (basmala excluded)."""
    return sum(1 for c in ayah_confidence(words).values() if c < LOW_CONFIDENCE)


def too_many_low(words: list[dict]) -> bool:
    """Enough low-confidence ayahs to try the aligner: at least 5 and at least 5% of the ayahs."""
    conf = ayah_confidence(words)
    low = sum(1 for c in conf.values() if c < LOW_CONFIDENCE)
    return low >= MIN_LOW_FOR_RETRY and low >= RETRY_SHARE * len(conf)


def words_from_aligner(refusal: str) -> bool:
    """True when the refusal came from comparing with the aligner (its words are already in hand)."""
    return refusal.startswith("published spans leave ")


def published_refusal(norm: Normalised, duration_ms: int) -> str | None:
    """Why normalised published timings can't be used for this file, or None when they can."""
    if norm.missing:
        return f"published timings miss ayah(s) {norm.missing}"
    last = norm.published_last_end_ms
    if last is not None and duration_ms - last > MAX_UNPUBLISHED_TAIL_MS:
        return f"published timings end at {last} ms, {duration_ms - last} ms before the audio ends"
    return None


def ayah_spans(words: list[dict], duration_ms: int) -> dict[int, tuple[int, int]]:
    """Ayah (start, end) from aligned words: each ayah ends where the next begins; the last at the file end."""
    firsts: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            firsts[w["ayah"]] = min(firsts.get(w["ayah"], w["start_ms"]), w["start_ms"])
    order = sorted(firsts)
    return {a: (firsts[a], firsts[order[i + 1]] if i + 1 < len(order) else duration_ms)
            for i, a in enumerate(order)}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshaf", type=int, default=86)
    p.add_argument("--surah", type=int, action="append", required=True, dest="surahs")
    p.add_argument("--manifest", type=Path, default=INGEST_OUT / "test-manifest-86.json")
    p.add_argument("--audio-dir", type=Path, default=None)
    p.add_argument("--raw-dir", type=Path, default=None)
    p.add_argument("--out-dir", type=Path, default=None)
    p.add_argument("--emissions-dir", type=Path, default=TOOL_DIR / "out" / "emissions")
    p.add_argument("--pauses-dir", type=Path, default=None)
    p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    p.add_argument("--fallback-aligner", action="store_true",
                   help="align a surah whose published timings are refused with the whole-surah aligner")
    args = p.parse_args(argv)
    base = TOOL_DIR / "out" / "published" / str(args.moshaf)
    args.audio_dir = args.audio_dir or INGEST_OUT / "audio" / f"mp3quran-{args.moshaf}"
    args.raw_dir = args.raw_dir or base
    args.out_dir = args.out_dir or base / "aligned"
    args.pauses_dir = args.pauses_dir or base / "pauses"

    ayahs = load_tanzil(args.tanzil)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    vocab, blank = load_vocab()
    failures = 0
    for surah in sorted(set(args.surahs)):
        try:
            r = run_surah(surah, args, manifest, ayahs, vocab, blank)
        except SurahRefused as err:
            failures += 1
            print(f"{surah:03d}: REFUSED: {err}", file=sys.stderr)
            continue
        if r["fallback"]:
            print(f"{surah:03d}: FALLBACK to the aligner ({r['fallback']})", file=sys.stderr)
        share = 100 * r["within_1s"] / r["starts_checked"] if r["starts_checked"] else float("nan")
        print(f"{surah:03d}: ayahs {r['ayahs']}, words {r['words']}, basmala recited {r['recited']}, "
              f"ayah starts within 1 s of a pause {r['within_1s']}/{r['starts_checked']} ({share:.1f}%), "
              f"pauses {r['pauses']}, low-confidence ayahs {r['low_conf_ayahs']}, "
              f"words squeezed {r['words_squeezed']}, dropped ayah-0 rows {r['dropped_ayah0']}, "
              f"end mismatches {r['end_mismatch']}, ayah 1 published {r['ayah1_published_start_ms']} ms, "
              f"first spoken word {r['ayah1_first_word_ms']} ms, duration {r['duration_ms']} ms")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
