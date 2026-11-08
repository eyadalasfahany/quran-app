"""QF word timings and audio for a check run, fetched at run time from Taybah's public API (developer, 8 Nov 2026).

    python3 scripts/qf_ref_fetch.py --pack-id 4 --reciter-id 7 --surah 18 36 --out-dir "$RUNNER_TEMP/qf/afasy"

Reads the content manifest (`/api/v1/content/manifest`), downloads the recitation pack (`/api/v1/content/packs/{id}/
{version}`, gzipped SQLite, sha256-checked against the manifest) and writes, under --out-dir only:

- `ref/qf-NNN.json`: the reference in a6_eval's `export_qf` shape, `[{"ayah", "start_ms", "end_ms", "words":
  [{"index", "start_ms", "end_ms"}]}]` in verse order (`words` empty when the segments are null);
- `audio/NNN.mp3`: the surah's audio from the pack's `chapter_audio_files.audio_url`;
- `manifest.json`: a Way2Quran-shaped manifest for that audio (`moshaf_id` and `reciter_id` --reciter-id, sha256,
  bytes, decoded duration, a placeholder URL ending in `NNN-<sha16>.mp3` as gated_export expects).

QF data stays on the runner: never commit these files or upload them as artifacts (ADR 0077 amendment of 8 Nov 2026).
Pack ids: Afasy 4, Al-Husary 3, Al-Sudais 17, Al-Minshawi 20. It prints counts only.
"""

import argparse
import gzip
import hashlib
import json
import shutil
import sqlite3
import sys
import urllib.request
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))
API = "https://app.taybah-app.com"
TANZIL = (TOOL / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()


def _get(url: str, dest: Path | None = None) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "taybah-recitation-check"})
    with urllib.request.urlopen(req, timeout=300) as r:
        if dest is None:
            return r.read()
        with open(dest, "wb") as f:
            shutil.copyfileobj(r, f, 1 << 20)
    return None


def pack_entry(manifest: dict, pack_id: int) -> dict:
    found = [r for r in manifest["resources"] if r["id"] == pack_id and r["group"] == "chapter_recitations"]
    if not found:
        raise SystemExit(f"pack {pack_id} is not a chapter recitation in the content manifest")
    return found[0]


def refs_from_pack(db: sqlite3.Connection, surah: int, ayah_of: dict[int, tuple[int, int]]) -> tuple[str, list[dict]]:
    """(the audio URL, the export_qf rows) of one surah."""
    row = db.execute("select id, audio_url from chapter_audio_files where chapter_id = ?", (surah,)).fetchone()
    if row is None:
        raise SystemExit(f"surah {surah} is not in the pack")
    out = []
    for verse_id, start, end, seg in db.execute("select verse_id, start_ms, end_ms, segments from recitation_timings "
                                                "where audio_file_id = ? order by verse_id", (row[0],)):
        s, a = ayah_of[verse_id]
        if s != surah:
            raise SystemExit(f"surah {surah}: a timing row of another surah")
        words = [{"index": i, "start_ms": b, "end_ms": e} for i, b, e in json.loads(seg)] if seg else []
        out.append({"ayah": a, "start_ms": start, "end_ms": end, "words": words})
    return row[1], out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pack-id", type=int, required=True)
    ap.add_argument("--reciter-id", type=int, required=True, help="the id the pipeline uses for this audio")
    ap.add_argument("--surah", type=int, nargs="+", required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--api", default=API)
    args = ap.parse_args(argv)

    from recitation_align.audio import file_sha256, load_wav16k
    from recitation_align.export import tanzil_index

    for sub in ("ref", "audio"):
        (args.out_dir / sub).mkdir(parents=True, exist_ok=True)
    entry = pack_entry(json.loads(_get(f"{args.api}/api/v1/content/manifest")), args.pack_id)
    body = _get(args.api + entry["pack"]["url"])
    if hashlib.sha256(body).hexdigest() != entry["pack"]["sha256"]:
        raise SystemExit(f"pack {args.pack_id}: sha256 does not match the content manifest")
    db_path = args.out_dir / f"pack-{args.pack_id}.sqlite"
    db_path.write_bytes(gzip.decompress(body))
    verse_ids, _ = tanzil_index(TANZIL)
    ayah_of = {v: k for k, v in verse_ids.items()}
    files = []
    with sqlite3.connect(db_path) as db:
        for n in args.surah:
            url, refs = refs_from_pack(db, n, ayah_of)
            (args.out_dir / f"ref/qf-{n:03d}.json").write_text(json.dumps(refs), encoding="utf-8")
            audio = args.out_dir / f"audio/{n:03d}.mp3"
            _get(url, audio)
            sha = file_sha256(audio)
            key = f"audio/qf/{args.pack_id}/{n:03d}-{sha[:16]}.mp3"
            files.append({"surah": n, "sha256": sha, "bytes": audio.stat().st_size,
                          "duration_ms": round(len(load_wav16k(audio)) / 16), "key": key,
                          "url": f"https://qf.invalid/{key}", "source_url": url})
            print(f"surah {n}: {len(refs)} ayahs, {sum(bool(r['words']) for r in refs)} with words")
    manifest = {"moshafs": [{"moshaf_id": args.reciter_id, "reciter_id": args.reciter_id, "files": files}]}
    (args.out_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
