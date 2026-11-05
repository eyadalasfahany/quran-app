"""Aligner output to committed timing files (plan step 02a, format version 1).

Reads `NNN.json` aligner outputs and writes one minified JSON file per recitation and surah with
ayah rows and word segments mapped to QF word positions. Local dev tool: imports only the standard
library and `recitation_align.text`, never torch, and never touches MySQL (ADR 0060).

    uv run python -m recitation_align.export --kind mp3quran --recitation-key 253 --in out/253-v7 \
        --out ../../apps/api/resources/recitation-timings/mp3quran/253
"""

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from .text import load_tanzil

FORMAT = 1
VOCATIVE = "يا"
FATHA = "َ"
KINDS = ("mp3quran", "qf")
SOURCES = ("aligner", "mp3quran_published")
TOOL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = Path(__file__).resolve().parents[3] / "apps/api/resources/mp3quran/manifest.json"
DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
FILE_RE = re.compile(r"(\d{3})\.json")


class Refused(Exception):
    """A surah that cannot be converted. The message is printed as `NNN: reason`."""


def _field(obj, key, kind, where=""):
    """Return a required field of the given type; None counts as missing."""
    if not isinstance(obj, dict) or obj.get(key) is None:
        raise Refused(f"missing {where}{key}")
    value = obj[key]
    if not isinstance(value, kind) or (kind is int and isinstance(value, bool)):
        raise Refused(f"{where}{key} must be {kind.__name__}")
    return value


def tanzil_index(path):
    """Global verse ids (1-based line index) and the ayah count per surah from a Tanzil file."""
    verse_ids = {}
    for index, key in enumerate(load_tanzil(path), start=1):
        verse_ids[key] = index
    counts = {}
    for surah, ayah in verse_ids:
        counts[surah] = max(counts.get(surah, 0), ayah)
    return verse_ids, counts


def is_vocative(word):
    """A standalone vocative particle. Only the fatha (U+064E) is stripped before comparing."""
    return word.replace(FATHA, "") == VOCATIVE


def check_aligner(doc, file_surah):
    """Validate the required aligner fields; optional keys are ignored."""
    surah = _field(doc, "surah", int)
    if surah != file_surah:
        raise Refused(f"surah {surah} inside the file does not match its name")
    _field(doc, "tool_version", str)
    align = _field(doc, "align_model", dict)
    _field(align, "id", str, "align_model.")
    _field(align, "revision", str, "align_model.")
    audio = _field(doc, "audio", dict)
    _field(audio, "bytes", int, "audio.")
    _field(audio, "sha256", str, "audio.")
    _field(audio, "duration_ms", int, "audio.")
    words = _field(doc, "words", list)
    for word in words:
        if not isinstance(word, dict):
            raise Refused("words must be objects")
        if word.get("surah") != file_surah:
            raise Refused(f"word surah {word.get('surah')} does not match the file")
        for key in ("ayah", "position", "start_ms", "end_ms"):
            _field(word, key, int, "word.")
        _field(word, "word", str, "word.")


def build_surah(doc, *, file_surah, kind, key, source, audio_url, verse_ids, counts):
    """Map one validated aligner document to the committed timing object (format 1)."""
    check_aligner(doc, file_surah)
    surah = file_surah
    count = counts.get(surah, 0)
    if count == 0:
        raise Refused("surah is not in the Tanzil file")
    audio = doc["audio"]
    duration = audio["duration_ms"]

    spoken = [w for w in doc["words"] if not w.get("basmala", False)]
    by_ayah = {}
    for w in spoken:
        by_ayah.setdefault(w["ayah"], []).append(w)
    for ayah in by_ayah:
        if ayah < 1 or ayah > count:
            raise Refused(f"ayah {ayah} is not in the Tanzil file")
    for n in range(1, count + 1):
        if n not in by_ayah:
            raise Refused(f"missing ayah {n}")

    starts = {1: 0}
    for n in range(2, count + 1):
        starts[n] = by_ayah[n][0]["start_ms"]
    ends = {n: starts[n + 1] for n in range(1, count)}
    ends[count] = duration

    rows = []
    for n in range(1, count + 1):
        if (surah, n) not in verse_ids:
            raise Refused(f"Tanzil has no ayah {n}")
        if starts[n] >= ends[n]:
            raise Refused(f"ayah {n} starts at {starts[n]} ms, not before its end {ends[n]} ms")
        if n > 1 and starts[n] <= starts[n - 1]:
            raise Refused(f"ayah starts are not strictly increasing at ayah {n}")
        ws = by_ayah[n]
        segments = map_segments(ws)
        for _, start, end in segments:
            if start >= end:
                raise Refused(f"ayah {n} has a segment that starts at {start} ms, not before its end {end} ms")
        rows.append({
            "verse_key": f"{surah}:{n}",
            "verse_id": verse_ids[(surah, n)],
            "start_ms": starts[n],
            "end_ms": ends[n],
            "segments": segments,
        })

    align = doc["align_model"]
    asr = doc.get("asr_model")
    return {
        "format": FORMAT,
        "kind": kind,
        "recitation_key": key,
        "chapter_id": surah,
        "audio": {
            "url": audio_url,
            "bytes": audio["bytes"],
            "sha256": audio["sha256"],
            "measured_duration_ms": duration,
        },
        "source": source,
        "tool_version": doc["tool_version"],
        "models": {
            "align": {"id": align["id"], "revision": align["revision"]},
            "asr": None if asr is None else {"id": asr["id"], "revision": asr["revision"]},
        },
        "original_first_start_ms": None,
        "ayahs": rows,
    }


def map_segments(ws):
    """QF word segments `[qf_position, start_ms, end_ms]` for one ayah, in recited order."""
    positions = sorted({w["position"] for w in ws})
    first_entry = {}
    for w in ws:
        first_entry.setdefault(w["position"], w)

    qmap = {}
    qf = 0
    k = 0
    while k < len(positions):
        qf += 1
        qmap[positions[k]] = qf
        if is_vocative(first_entry[positions[k]]["word"]) and k + 1 < len(positions):
            k += 1
            qmap[positions[k]] = qf
        k += 1

    next_position = {positions[k]: positions[k + 1] for k in range(len(positions) - 1)}
    segments = []
    i = 0
    while i < len(ws):
        w = ws[i]
        nxt = ws[i + 1] if i + 1 < len(ws) else None
        if (is_vocative(w["word"]) and w["position"] in next_position
                and nxt is not None and nxt["position"] == next_position[w["position"]]):
            segments.append([qmap[w["position"]], w["start_ms"], nxt["end_ms"]])
            i += 2
            continue
        segments.append([qmap[w["position"]], w["start_ms"], w["end_ms"]])
        i += 1
    return segments


def mp3quran_audio(manifest, key, surah, aligner_audio):
    """The manifest's audio URL for this moshaf and surah, after the hash checks."""
    entry = None
    for moshaf in manifest.get("moshafs", []):
        if str(moshaf.get("moshaf_id")) == key:
            for item in moshaf.get("files", []):
                if item.get("surah") == surah:
                    entry = item
                    break
            break
    if entry is None:
        raise Refused(f"no manifest entry for moshaf {key} surah {surah}")
    if aligner_audio["sha256"] != entry.get("sha256"):
        raise Refused("audio sha256 differs from the manifest")
    if aligner_audio["bytes"] != entry.get("bytes"):
        raise Refused("audio bytes differ from the manifest")
    url = entry.get("url")
    if not isinstance(url, str) or not url.endswith(f"/{surah:03d}-{entry['sha256'][:16]}.mp3"):
        raise Refused("manifest URL does not end with the file name and sha256 prefix")
    return url


def qf_audio(urls, surah):
    url = urls.get(str(surah))
    if not isinstance(url, str) or not url:
        raise Refused(f"no audio URL for chapter {surah} in --urls")
    return url


def _write_atomic(path, data):
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def encode(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _parse(argv):
    parser = argparse.ArgumentParser(prog="recitation_align.export",
                                     description="Convert aligner output to committed timing files.")
    parser.add_argument("--kind", required=True, choices=KINDS)
    parser.add_argument("--recitation-key", required=True, help="moshaf id (mp3quran) or QF reciter id (qf)")
    parser.add_argument("--in", dest="in_dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--urls", type=Path)
    parser.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    parser.add_argument("--surah", type=int, action="append", dest="surahs")
    parser.add_argument("--source", default="aligner", choices=SOURCES)
    args = parser.parse_args(argv)
    if args.kind == "qf" and args.urls is None:
        parser.error("--urls is required for --kind qf")
    if args.surahs is not None:
        for surah in args.surahs:
            if not 1 <= surah <= 114:
                parser.error(f"--surah {surah} is not in 1..114")
    return args


def main(argv=None):
    args = _parse(argv if argv is not None else sys.argv[1:])
    try:
        verse_ids, counts = tanzil_index(args.tanzil)
        manifest = None
        if args.kind == "mp3quran":
            manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        urls = None
        if args.kind == "qf":
            urls = json.loads(args.urls.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 1

    found = {}
    for path in args.in_dir.iterdir():
        match = FILE_RE.fullmatch(path.name)
        if match:
            found[int(match.group(1))] = path
    selected = sorted(set(args.surahs)) if args.surahs else sorted(found)
    if not selected:
        print("error: no NNN.json aligner outputs selected", file=sys.stderr)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)
    failures = []
    for surah in selected:
        label = f"{surah:03d}"
        try:
            if surah not in found:
                raise Refused("no aligner output in --in")
            try:
                doc = json.loads(found[surah].read_text(encoding="utf-8"))
            except ValueError as err:
                raise Refused(f"invalid JSON: {err}") from err
            check_aligner(doc, surah)
            if args.kind == "mp3quran":
                url = mp3quran_audio(manifest, args.recitation_key, surah, doc["audio"])
            else:
                url = qf_audio(urls, surah)
            timing = build_surah(doc, file_surah=surah, kind=args.kind, key=args.recitation_key,
                                 source=args.source, audio_url=url, verse_ids=verse_ids, counts=counts)
            data = encode(timing)
        except Refused as err:
            failures.append(f"{label}: {err}")
            continue
        _write_atomic(args.out / f"{label}.json", data)
        print(f"{label}: wrote {len(timing['ayahs'])} ayahs")

    for line in failures:
        print(line, file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
