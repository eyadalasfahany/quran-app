"""Gated export of Way2Quran timing files (ADR 0077, plan way2quran-quality Q6b).

    uv run python -m recitation_align.gated_export --kind way2quran --recitation-key R \
        --in aligned --gate-dir gate --out DIR --source aligner

Only a surah whose gate record says `pass` or `repaired` gets a timing file. `no_highlight` and `unavailable`
surahs get none. For a shipped surah the ayahs listed in the record's `segments_null` are written with
`"segments": null`; every other byte comes from `export.build_surah` and the export's own writer, so with no
nulls the file is byte-identical to `export.main` for the same document. `export.py` is unchanged (P13).
An aligned document with no gate record, a `pass` without an aligned document, or a document of another file
(sha256 differs from the gate record) is a failure: the surah gets no file and the exit code is 1.
"""

import argparse
import json
import sys
from pathlib import Path

from . import export
from .export import Refused
from .report import validate_gate

SHIPPED = ("pass", "repaired")
KINDS = ("way2quran",)


def _parse(argv):
    parser = argparse.ArgumentParser(prog="recitation_align.gated_export",
                                     description="Export the gated surahs of a Way2Quran reciter.")
    parser.add_argument("--kind", required=True, choices=KINDS)
    parser.add_argument("--recitation-key", required=True)
    parser.add_argument("--in", dest="in_dir", required=True, type=Path)
    parser.add_argument("--gate-dir", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--tanzil", type=Path, default=export.DEFAULT_TANZIL)
    parser.add_argument("--surah", type=int, action="append", dest="surahs")
    parser.add_argument("--source", default="aligner", choices=export.SOURCES)
    args = parser.parse_args(argv)
    if args.manifest is None:
        args.manifest = export.DEFAULT_MANIFESTS[args.kind]
    if args.out is None:
        args.out = export.DEFAULT_OUT_ROOTS[args.kind] / args.recitation_key
    for surah in args.surahs or []:
        if not 1 <= surah <= 114:
            parser.error(f"--surah {surah} is not in 1..114")
    return args


def _numbered(directory):
    found = {}
    if directory.is_dir():
        for path in directory.iterdir():
            match = export.FILE_RE.fullmatch(path.name)
            if match:
                found[int(match.group(1))] = path
    return found


def _load(path, what):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as err:
        raise Refused(f"invalid {what} JSON: {err}") from err


def null_segments(timing, nulls):
    """Set `segments` to None on the listed ayah numbers of a built timing object."""
    rows = {row["verse_key"].split(":")[1]: row for row in timing["ayahs"]}
    for ayah in nulls:
        row = rows.get(str(ayah))
        if row is None:
            raise Refused(f"segments_null lists ayah {ayah}, which the surah does not have")
        row["segments"] = None


def main(argv=None):
    args = _parse(argv if argv is not None else sys.argv[1:])
    try:
        verse_ids, counts = export.tanzil_index(args.tanzil)
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 1

    aligned = _numbered(args.in_dir)
    gates = _numbered(args.gate_dir)
    selected = sorted(set(args.surahs)) if args.surahs else sorted(set(aligned) | set(gates))
    if not selected:
        print("error: no aligned documents or gate records selected", file=sys.stderr)
        return 1

    failures = []
    written = 0
    for surah in selected:
        label = f"{surah:03d}"
        try:
            if surah not in gates:
                if surah in aligned:
                    raise Refused("aligned document has no gate record")
                raise Refused("no gate record in --gate-dir")
            record = _load(gates[surah], "gate")
            validate_gate(record)
            if record["surah"] != surah:
                raise Refused(f"gate record is for surah {record['surah']}")
            if record["verdict"] not in SHIPPED:
                continue
            if surah not in aligned:
                raise Refused(f"gate verdict {record['verdict']} but no aligned document in --in")
            doc = _load(aligned[surah], "aligned")
            export.check_aligner(doc, surah)
            if doc["audio"]["sha256"] != record["sha256"]:
                raise Refused("audio sha256 differs from the gate record")
            url = export.manifest_audio(manifest, args.recitation_key, surah, doc["audio"])
            source = doc.get("source", args.source)
            if source != "aligner":
                raise Refused(f"way2quran has no published timings; source must be aligner, not {source}")
            timing = export.build_surah(doc, file_surah=surah, kind=args.kind, key=args.recitation_key,
                                        source=source, audio_url=url, verse_ids=verse_ids, counts=counts)
            null_segments(timing, record["segments_null"])
            data = export.encode(timing)
        except Refused as err:
            failures.append(f"{label}: {err}")
            continue
        args.out.mkdir(parents=True, exist_ok=True)
        export._write_atomic(args.out / f"{label}.json", data)
        written += 1
        print(f"{label}: wrote {len(timing['ayahs'])} ayahs ({len(record['segments_null'])} segments null)")

    for line in failures:
        print(line, file=sys.stderr)
    if not written and not failures:
        print("no surah passed the gate: no timing files written")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
