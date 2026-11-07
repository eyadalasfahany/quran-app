"""Way2Quran completeness check (ADR 0077 decision 2, plan way2quran-quality Q2).

  w2q_completeness.py --reciter ID --manifest DRY --audio-dir DIR [--surah N ...] --out-dir DIR --asr-dir DIR

Reads the dry manifest (sha256 and bytes of each file) and `DIR/NNN.mp3`, checks each surah's opening and ending
with the ASR, and writes `OUT/NNN.json` (one completeness record per surah) plus `OUT/complete-surahs.json` (a
list of ints). The ASR windows are cached in `ASR/NNN.json`, in the format the anchors share.

Exit code: 0 when every file was checked, even if some are incomplete; non-zero only on a tool error.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOL_DIR))

from recitation_align.audio import load_wav16k  # noqa: E402
from recitation_align.completeness import check_file  # noqa: E402
from recitation_align.text import load_tanzil  # noqa: E402

DEFAULT_TANZIL = (TOOL_DIR / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()


def manifest_files(path: Path, reciter: int) -> dict[int, dict]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    moshafs = [m for m in doc["moshafs"] if m.get("moshaf_id") == reciter]
    if len(moshafs) != 1:
        raise SystemExit(f"{path} has no single moshaf for reciter {reciter}")
    return {f["surah"]: f for f in moshafs[0]["files"]}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--reciter", type=int, required=True)
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--audio-dir", type=Path, required=True)
    p.add_argument("--surah", type=int, nargs="*", default=None)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--asr-dir", type=Path, required=True)
    p.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    args = p.parse_args(argv)

    from recitation_align.transcribe import cached_transcribe_at  # loads torch; imported here for --help

    files = manifest_files(args.manifest, args.reciter)
    surahs = sorted(args.surah) if args.surah else sorted(files)
    missing = [s for s in surahs if s not in files]
    if missing:
        print(f"surah(s) {missing} are not in the manifest", file=sys.stderr)
        return 2
    ayahs = load_tanzil(args.tanzil)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.asr_dir.mkdir(parents=True, exist_ok=True)

    complete = []
    for surah in surahs:
        entry = files[surah]
        name = f"{surah:03d}.mp3"
        wav = load_wav16k(args.audio_dir / name)
        cache = args.asr_dir / f"{surah:03d}.json"

        def transcribe_windows(windows, wav=wav, sha=entry["sha256"], cache=cache):
            return [w["text"] for w in cached_transcribe_at(wav, sha, cache, windows)["windows"]]

        record = check_file(
            wav, surah, ayahs, entry["sha256"], entry["bytes"], transcribe_windows,
            file=name, source_last_modified=entry.get("source_last_modified"),
        )
        (args.out_dir / f"{surah:03d}.json").write_text(
            json.dumps(record, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"surah {surah}: {record['verdict']} head {record['opening']['scores']} "
              f"tail {record['ending']['scores']} range {record['first_heard_ayah']}-{record['last_heard_ayah']} "
              f"of {record['ayah_count']} extra_calls {record['asr_calls_extra']}", flush=True)
        if record["verdict"] == "complete":
            complete.append(surah)
    (args.out_dir / "complete-surahs.json").write_text(json.dumps(complete) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
