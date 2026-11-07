"""Stage one Way2Quran quality-mode chunk's hand-off folder (ADR 0077, plan way2quran-quality Q3).

  w2q_stage.py --reciter ID --chunk N --surahs-json '[..]' --ingest-out DIR --align-out DIR --handoff DIR

Layout written under --handoff (the upload-artifact path):

  aligned/ completeness/ asr/ gate/ refused/     the chunk's records, each only if it exists
  dry-manifest-ID-N.json                          always (the measured files)
  manifest-ID-N.json                              only if something was uploaded (the upload part)
  chunk-ID-N.json                                 always: {reciter, chunk, surahs, complete, uploaded}

`chunk-ID-N.json` is named per chunk because the finalize download merges every chunk's artifact into one
folder, and a shared name would be overwritten. Finalize does not read it; it is for people and the next steps.
The artifact is never empty, even when every surah of the chunk is incomplete.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

SUBDIRS = ("aligned", "completeness", "asr", "gate", "refused")


def uploaded_surahs(path: Path, reciter: int) -> list[int]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    return sorted(int(f["surah"]) for m in doc.get("moshafs", []) if m.get("moshaf_id") == reciter
                  for f in m.get("files", []))


def stage(reciter: int, chunk: int, surahs: list[int], ingest_out: Path, align_out: Path, handoff: Path) -> dict:
    handoff.mkdir(parents=True, exist_ok=True)
    dry = ingest_out / f"dry-manifest-{reciter}-{chunk}.json"
    if not dry.is_file():
        raise SystemExit(f"the dry manifest {dry} is missing: the chunk did not measure its files")
    shutil.copy2(dry, handoff / dry.name)

    upload = ingest_out / f"manifest-{reciter}-{chunk}.json"
    uploaded: list[int] = []
    if upload.is_file():
        shutil.copy2(upload, handoff / upload.name)
        uploaded = uploaded_surahs(upload, reciter)

    wanted = {f"{s:03d}.json" for s in surahs}
    for name in SUBDIRS:
        source = align_out / name
        if not source.is_dir():
            continue
        target = handoff / name
        target.mkdir(parents=True, exist_ok=True)
        for path in sorted(source.glob("*.json")):
            if path.name in wanted:  # the list file complete-surahs.json is not a record
                shutil.copy2(path, target / path.name)

    complete_file = align_out / "completeness" / "complete-surahs.json"
    complete = sorted(json.loads(complete_file.read_text(encoding="utf-8"))) if complete_file.is_file() else []
    record = {"reciter": reciter, "chunk": chunk, "surahs": sorted(surahs), "complete": complete, "uploaded": uploaded}
    (handoff / f"chunk-{reciter}-{chunk}.json").write_text(
        json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return record


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--reciter", type=int, required=True)
    p.add_argument("--chunk", type=int, required=True)
    p.add_argument("--surahs-json", required=True)
    p.add_argument("--ingest-out", type=Path, required=True)
    p.add_argument("--align-out", type=Path, required=True)
    p.add_argument("--handoff", type=Path, required=True)
    args = p.parse_args(argv)
    record = stage(args.reciter, args.chunk, [int(s) for s in json.loads(args.surahs_json)],
                   args.ingest_out, args.align_out, args.handoff)
    print(f"staged chunk {args.chunk}: {len(record['complete'])} complete, {len(record['uploaded'])} uploaded "
          f"of {len(record['surahs'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
