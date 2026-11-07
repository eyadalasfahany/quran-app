"""GitHub Actions helpers for the add-reciter workflow (ADR 0061, amended 5 Nov 2026).

Standard library only, so the plan and finalize jobs run without torch. Nothing here reads Quran text
into output: reports carry ids, counts and confidences only. The MP3Quran API is reached through `Api`,
which tests replace with a fake (no network in tests).

Steps: `plan` (refuse or chunk), `fetch_published` (raw published timings for one chunk),
`merge_manifest` (chunk parts into the committed manifest, all or nothing), `check_aligned` (every
surah of the reciter has an aligned file), `quality_summary` (PR body table).
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any
from urllib import error, parse, request

from .text import load_tanzil

DEFAULT_API = "https://www.mp3quran.net/api/v3"
USER_AGENT = "recitation-align-ci/0.1 (Taybah add-reciter workflow, ADR 0061)"
HAFS_REWAYA_ID = 1
MANIFEST_SCHEMA = 1
MANIFEST_SOURCE = "mp3quran"
WAY2QURAN_SOURCE = "way2quran"
SOURCES = (MANIFEST_SOURCE, WAY2QURAN_SOURCE)
# Committed manifests per source, relative to the repository root (ADR 0061, ADR 0074 decision 5).
MANIFEST_PATHS = {
    MANIFEST_SOURCE: "apps/api/resources/mp3quran/manifest.json",
    WAY2QURAN_SOURCE: "apps/api/resources/way2quran/manifest.json",
}
# How a source reads in refusal messages. The mp3quran wording is the one shipped with ADR 0061.
SOURCE_LABELS = {MANIFEST_SOURCE: "an mp3quran", WAY2QURAN_SOURCE: "a Way2Quran"}
WAY2QURAN_SCHEMA = 1
WAY2QURAN_HAFS_FOLDER = "hafs-an-asim"
LOW_CONFIDENCE = 0.4
MAX_CHUNKS = 20
# The chunks input's default is empty (P2): each source has its own default.
DEFAULT_CHUNKS = {MANIFEST_SOURCE: 6, WAY2QURAN_SOURCE: 20}
MOSHAF_IDS_RE = re.compile(r"[0-9]+(,[0-9]+)*")
PHP_HEAD_RE = r"'{key}'\s*=>\s*\["
DONE_PATTERNS = {
    MANIFEST_SOURCE: re.compile(r"align-[0-9]+-[0-9]+"),
    WAY2QURAN_SOURCE: re.compile(r"align-w2q-[0-9]+-[0-9]+"),
}


class CiError(Exception):
    """A refusal or a fault. The message is shown in the job log as the reason."""


class Api:
    """MP3Quran API v3 over urllib (the same client shape as mp3quran-ingest)."""

    def __init__(self, base: str = DEFAULT_API, timeout: float = 60.0) -> None:
        self.base = base.rstrip("/")
        self.timeout = timeout

    def get_json(self, path: str, **params: str) -> Any:
        query = parse.urlencode(params)
        url = f"{self.base}/{path}" + (f"?{query}" if query else "")
        req = request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                body = response.read()
        except (error.URLError, OSError) as exc:
            raise CiError(f"MP3Quran API request failed: {path}: {exc}") from exc
        try:
            return json.loads(body.decode("utf-8"))
        except ValueError as exc:
            raise CiError(f"MP3Quran API returned invalid JSON: {path}") from exc


def parse_moshaf_ids(text: str) -> list[int]:
    """Comma-separated moshaf ids. Spaces around commas are allowed; anything else is refused."""
    compact = re.sub(r"\s*,\s*", ",", text.strip())
    if not MOSHAF_IDS_RE.fullmatch(compact):
        raise CiError(f"moshaf_ids must be comma-separated integers, got {text!r}")
    ids = [int(part) for part in compact.split(",")]
    if len(set(ids)) != len(ids):
        raise CiError("moshaf_ids lists the same moshaf twice")
    return ids


def parse_chunks(value: str, source: str | None = None) -> int:
    """Chunks per moshaf. An empty value means the source's default (6 for mp3quran, 20 for way2quran)."""
    if source is not None and not value.strip():
        check_source(source)
        return DEFAULT_CHUNKS[source]
    if not re.fullmatch(r"[0-9]+", value.strip()):
        raise CiError(f"chunks must be an integer, got {value!r}")
    chunks = int(value)
    if not 1 <= chunks <= MAX_CHUNKS:
        raise CiError(f"chunks must be 1 to {MAX_CHUNKS}, got {chunks}")
    return chunks


def parse_surah_list(text: str) -> list[int]:
    surahs = sorted(int(part) for part in text.split(",") if part.strip())
    if not surahs or any(not 1 <= s <= 114 for s in surahs):
        raise CiError(f"surah_list is not a list of surah numbers: {text!r}")
    return surahs


def php_array_keys(source: str, key: str) -> list[int]:
    """Integer keys of a flat PHP array literal `'key' => [...]` in config/quran.php.

    Accepts `N` and `N => M` items only. Anything else (comments, strings, nesting) is refused, so the
    plan never guesses at a list it cannot read.
    """
    match = re.search(PHP_HEAD_RE.format(key=re.escape(key)), source)
    if match is None:
        raise CiError(f"quran.php: '{key}' array not found")
    end = source.find("]", match.end())
    if end < 0:
        raise CiError(f"quran.php: '{key}' array is not closed")
    body = source[match.end():end].strip()
    if not body:
        return []
    if not re.fullmatch(r"\s*\d+(\s*=>\s*\d+)?\s*(,\s*\d+(\s*=>\s*\d+)?\s*)*,?\s*", body):
        raise CiError(f"quran.php: '{key}' holds something this check cannot read")
    keys = []
    for item in body.rstrip(", \n\t").split(","):
        keys.append(int(item.split("=>")[0].strip()))
    return keys


def resolve_moshaf(api: Api, moshaf_id: int) -> dict[str, Any]:
    """Moshaf metadata from the Arabic reciters list. Refuses a moshaf that is not Hafs."""
    for reciter in api.get_json("reciters", language="ar")["reciters"]:
        for moshaf in reciter.get("moshaf", []):
            if int(moshaf["id"]) != moshaf_id:
                continue
            if int(moshaf["rewaya_id"]) != HAFS_REWAYA_ID:
                raise CiError(f"moshaf {moshaf_id} is not Hafs (rewaya_id {moshaf['rewaya_id']})")
            server = str(moshaf["server"])
            if not server.endswith("/"):
                raise CiError(f"moshaf {moshaf_id} server does not end with '/'")
            return {
                "moshaf_id": moshaf_id,
                "reciter_id": int(reciter["id"]),
                "server": server,
                "surah_list": parse_surah_list(str(moshaf["surah_list"])),
            }
    raise CiError(f"moshaf {moshaf_id} is not in the MP3Quran reciters list")


def find_read(api: Api, server: str) -> int:
    """The published reading whose folder matches the moshaf server (trailing slashes ignored)."""
    wanted = server.rstrip("/")
    matches = [r for r in api.get_json("ayat_timing/reads") if str(r.get("folder_url", "")).rstrip("/") == wanted]
    if not matches:
        raise CiError(f"no published timings: {server} is not a folder in ayat_timing/reads")
    if len(matches) > 1:
        ids = sorted(int(r["id"]) for r in matches)
        raise CiError(f"{server} matches several published readings {ids}; choose by hand")
    return int(matches[0]["id"])


def surah_weights(tanzil_path: Path) -> dict[int, int]:
    """Characters of Tanzil text per surah: a length estimate for balancing chunks. Nothing is printed."""
    weights: dict[int, int] = {}
    for (surah, _ayah), text in load_tanzil(tanzil_path).items():
        weights[surah] = weights.get(surah, 0) + len(text)
    return weights


def chunk_surahs(surahs: list[int], weights: dict[int, int], chunks: int) -> list[list[int]]:
    """Greedy balance: longest surah first into the lightest chunk. Deterministic; empty chunks dropped."""
    count = min(chunks, len(surahs))
    buckets: list[list[int]] = [[] for _ in range(count)]
    loads = [0] * count
    for surah in sorted(surahs, key=lambda s: (-weights.get(s, 0), s)):
        target = loads.index(min(loads))
        buckets[target].append(surah)
        loads[target] += weights.get(surah, 0)
    return [sorted(bucket) for bucket in buckets if bucket]


def committed_surahs(manifest: dict[str, Any] | None, moshaf_id: int) -> set[int]:
    if not manifest:
        return set()
    for record in manifest.get("moshafs", []):
        if int(record["moshaf_id"]) == moshaf_id:
            return {int(f["surah"]) for f in record.get("files", [])}
    return set()


def load_json_or_none(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def check_source(source: str) -> None:
    if source not in SOURCES:
        raise CiError(f"unknown source {source!r}; use one of {', '.join(SOURCES)}")


def artifact_name(source: str, ident: int, chunk: int) -> str:
    """Hand-off artifact name. Way2Quran's carries a `w2q-` part, so it never meets an MP3Quran moshaf's (ADR 0074)."""
    check_source(source)
    prefix = "align-w2q-" if source == WAY2QURAN_SOURCE else "align-"
    return f"{prefix}{ident}-{chunk}"


def way2quran_reciters(data: Any) -> dict[int, dict[str, Any]]:
    """Reciter records of the Way2Quran data file, keyed by reciter id. Refuses a file it cannot read."""
    if not isinstance(data, dict) or data.get("schema") != WAY2QURAN_SCHEMA or not isinstance(data.get("reciters"), list):
        raise CiError("the Way2Quran reciter data file is not schema 1 with a reciters list")
    reciters: dict[int, dict[str, Any]] = {}
    for item in data["reciters"]:
        rid = int(item["reciter_id"])
        if rid in reciters:
            raise CiError(f"reciter {rid} is listed twice in the Way2Quran reciter data file")
        reciters[rid] = item
    return reciters


def way2quran_surah_list(item: dict[str, Any]) -> list[int]:
    """The surahs the reciter's data file lists (its Hafs files, keyed by surah number)."""
    surahs = sorted(int(s) for s in (item.get("files") or {}))
    if any(not 1 <= s <= 114 for s in surahs):
        raise CiError(f"reciter {item['reciter_id']} lists a surah outside 1..114")
    return surahs


def plan_way2quran(moshaf_ids: list[int], chunks: int, *, manifest: dict[str, Any] | None,
                   data: Any, tanzil_path: Path) -> dict[str, Any]:
    """Way2Quran plan: refuse or chunk from the reciter data file. Makes no MP3Quran call (ADR 0074 decision 7).

    Refuses: an id not in the data file, a reciter with no Hafs files, a reciter already complete in the
    committed Way2Quran manifest. The MP3Quran held and duplicates lists do not apply, and no published
    timings exist to check (`plan` never reads them for this source).
    """
    reciters = way2quran_reciters(data)
    weights = surah_weights(tanzil_path)
    reasons: list[str] = []
    entries: list[dict[str, Any]] = []
    for reciter_id in moshaf_ids:
        try:
            item = reciters.get(reciter_id)
            if item is None:
                raise CiError(f"reciter {reciter_id} is not in the Way2Quran reciter data file")
            surahs = way2quran_surah_list(item)
            if item.get("riwayah_folder") != WAY2QURAN_HAFS_FOLDER or not surahs:
                raise CiError(f"reciter {reciter_id} has no Hafs files")
            if set(surahs) <= committed_surahs(manifest, reciter_id):
                raise CiError(f"reciter {reciter_id} is already in the committed Way2Quran manifest with all its surahs")
        except CiError as err:
            reasons.append(str(err))
            continue
        for index, group in enumerate(chunk_surahs(surahs, weights, chunks), start=1):
            entries.append({"moshaf": reciter_id, "chunk": index, "surahs": group})
    if reasons:
        raise CiError("refused: " + "; ".join(reasons))
    return {"chunks": entries, "moshafs": moshaf_ids}


def plan(api: Api | None, moshaf_ids: list[int], chunks: int, *, manifest: dict[str, Any] | None,
         php_source: str | None, tanzil_path: Path, source: str = MANIFEST_SOURCE,
         way2quran_data: Any = None) -> dict[str, Any]:
    """Refuse or chunk. Every refusal is collected first, so one run shows all of them.

    `source` picks the rules: mp3quran (the MP3Quran moshaf checks, which need `api` and `php_source`) or
    way2quran (`plan_way2quran`, which needs `way2quran_data` and never touches `api`).
    """
    check_source(source)
    if source == WAY2QURAN_SOURCE:
        if way2quran_data is None:
            raise CiError("plan: way2quran_data is needed for way2quran")
        return plan_way2quran(moshaf_ids, chunks, manifest=manifest, data=way2quran_data, tanzil_path=tanzil_path)
    if api is None or php_source is None:
        raise CiError("plan: api and php_source are needed for mp3quran")
    held = set(php_array_keys(php_source, "mp3quran_held_moshafs"))
    duplicates = set(php_array_keys(php_source, "mp3quran_duplicates"))
    weights = surah_weights(tanzil_path)
    reasons: list[str] = []
    entries: list[dict[str, Any]] = []
    for moshaf_id in moshaf_ids:
        try:
            meta = resolve_moshaf(api, moshaf_id)
            if moshaf_id in held:
                raise CiError(f"moshaf {moshaf_id} is held in mp3quran_held_moshafs")
            if moshaf_id in duplicates:
                raise CiError(f"moshaf {moshaf_id} is listed in mp3quran_duplicates")
            find_read(api, meta["server"])
            have = committed_surahs(manifest, moshaf_id)
            if set(meta["surah_list"]) <= have:
                raise CiError(f"moshaf {moshaf_id} is already in the committed manifest with all its surahs")
        except CiError as err:
            reasons.append(str(err))
            continue
        for index, group in enumerate(chunk_surahs(meta["surah_list"], weights, chunks), start=1):
            entries.append({"moshaf": moshaf_id, "chunk": index, "surahs": group})
    if reasons:
        raise CiError("refused: " + "; ".join(reasons))
    return {"chunks": entries, "moshafs": moshaf_ids}


def parse_done_artifacts(text: str, source: str = MANIFEST_SOURCE) -> set[str]:
    """Names of hand-off artifacts an earlier run already uploaded (comma-separated, blanks ignored).

    Only this source's names pass: an MP3Quran resume never reuses a Way2Quran hand-off, and the reverse.
    """
    check_source(source)
    names = {part.strip() for part in text.split(",") if part.strip()}
    bad = sorted(n for n in names if not DONE_PATTERNS[source].fullmatch(n))
    if bad:
        raise CiError(f"unexpected artifact names from the resumed run: {', '.join(bad)}")
    return names


def drop_done_chunks(entries: list[dict[str, Any]], done: set[str],
                     source: str = MANIFEST_SOURCE) -> list[dict[str, Any]]:
    """Resume: keep only the chunks whose hand-off the earlier run never uploaded.

    The chunk numbers match only when the earlier run used the same chunk count; a mismatch makes a
    surah appear twice or not at all, and the manifest merge refuses both.
    """
    return [e for e in entries if artifact_name(source, e["moshaf"], e["chunk"]) not in done]


def fetch_published(api: Api, moshaf_id: int, surahs: list[int], out_dir: Path) -> list[Path]:
    """Save `ayat_timing?surah=N&read=R` as `raw-N.json` (the name pilot_published reads, not padded)."""
    meta = resolve_moshaf(api, moshaf_id)
    read = find_read(api, meta["server"])
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for surah in sorted(set(surahs)):
        if surah not in meta["surah_list"]:
            raise CiError(f"surah {surah} is not in moshaf {moshaf_id}'s surah_list")
        rows = api.get_json("ayat_timing", surah=str(surah), read=str(read))
        if not isinstance(rows, list) or not rows:
            raise CiError(f"surah {surah}: no published rows for reading {read}")
        path = out_dir / f"raw-{surah}.json"
        path.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
        written.append(path)
    return written


def encode_manifest(data: dict[str, Any]) -> str:
    """The writer mp3quran-ingest uses (manifest.py), copied so bytes match for untouched moshafs."""
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def _content(manifest: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in manifest.items() if k != "generated_at"}


def merge_manifest(committed: dict[str, Any] | None, parts: list[dict[str, Any]], moshaf_id: int,
                   source: str = MANIFEST_SOURCE, *, surah_list: list[int] | None = None) -> dict[str, Any]:
    """Replace one moshaf's record with the union of its chunk parts. Other moshafs are untouched.

    `source` is the manifest's source string (mp3quran or way2quran, ADR 0074); every part and the committed
    manifest (when it has a source) must carry it. A missing committed manifest (`None`) starts a new one.

    `surah_list` (Way2Quran quality mode, ADR 0077) replaces the parts' list with the reciter's remaining
    surahs after exclusions; the default keeps the parts' list, so a partial reciter is still refused.

    Refuses: a part for another moshaf, metadata that differs between parts, a surah listed twice, a
    surah outside surah_list, a missing surah (never ship a partial reciter), a public_base mismatch.
    """
    check_source(source)
    if not parts:
        raise CiError("no manifest parts to merge")
    records: list[dict[str, Any]] = []
    for part in parts:
        if part.get("schema") != MANIFEST_SCHEMA or part.get("source") != source:
            raise CiError(f"a manifest part is not {SOURCE_LABELS[source]} manifest, schema 1")
        for record in part.get("moshafs", []):
            if int(record["moshaf_id"]) != moshaf_id:
                raise CiError(f"a manifest part holds moshaf {record['moshaf_id']}, expected {moshaf_id}")
            records.append(record)
    if not records:
        raise CiError(f"the manifest parts hold no moshaf {moshaf_id}")

    def meta_of(record: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in record.items() if k != "files"}

    meta = meta_of(records[0])
    if any(meta_of(r) != meta for r in records[1:]):
        raise CiError(f"moshaf {moshaf_id} metadata differs between parts")
    public_bases = {p.get("public_base") for p in parts}
    if len(public_bases) != 1:
        raise CiError("manifest parts disagree on public_base")
    public_base = public_bases.pop()
    if committed is not None and committed.get("public_base") != public_base:
        raise CiError("public_base differs from the committed manifest")
    if committed is not None and "source" in committed and committed["source"] != source:
        raise CiError(f"the committed manifest is not {SOURCE_LABELS[source]} manifest")

    if surah_list is not None:
        meta = {**meta, "surah_list": sorted(surah_list)}
    surah_list = sorted(int(s) for s in meta["surah_list"])
    files: dict[int, dict[str, Any]] = {}
    for record in records:
        for entry in record.get("files", []):
            surah = int(entry["surah"])
            if surah not in surah_list:
                raise CiError(f"surah {surah} is not in moshaf {moshaf_id}'s surah_list")
            if surah in files:
                raise CiError(f"surah {surah} appears in two parts")
            files[surah] = entry
    missing = [s for s in surah_list if s not in files]
    if missing:
        raise CiError(f"moshaf {moshaf_id} is missing surah(s) {missing}; refusing a partial reciter")

    new_record = {**meta, "files": [files[s] for s in surah_list]}
    base_moshafs = committed.get("moshafs", []) if committed else []
    others = [r for r in base_moshafs if int(r["moshaf_id"]) != moshaf_id]
    moshafs = sorted(others + [new_record], key=lambda r: int(r["moshaf_id"]))
    manifest: dict[str, Any] = {
        "schema": MANIFEST_SCHEMA,
        "source": source,
        "generated_at": None,
        "public_base": public_base,
        "moshafs": moshafs,
    }
    if committed is not None and _content(committed) == _content(manifest):
        manifest["generated_at"] = committed.get("generated_at")
    else:
        manifest["generated_at"] = max(str(p.get("generated_at") or "") for p in parts) or None
    return manifest


def write_text_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def check_aligned(aligned_dir: Path, surahs: list[int], refused: frozenset[int] | set[int] = frozenset()) -> None:
    """Every surah of the reciter has an aligned NNN.json, and no other surah is present.

    `refused` (quality mode, P12): surahs the aligner refused. They have no aligned file and are not an error.
    """
    found = {int(m.group(1)) for p in aligned_dir.glob("*.json") if (m := re.fullmatch(r"(\d{3})\.json", p.name))}
    missing = [s for s in surahs if s not in found and s not in refused]
    if missing:
        raise CiError(f"aligned output missing for surah(s) {missing}; refusing a partial reciter")
    extra = sorted(found - set(surahs))
    if extra:
        raise CiError(f"aligned output holds surah(s) {extra} that are not in the reciter's list")


def quality_summary(aligned_dir: Path, surahs: list[int]) -> str:
    """Markdown table for the PR body: counts and confidences only, no text."""
    rows = [
        "| Surah | Source | Ayahs | Words | Lowest ayah confidence | Ayahs below 0.4 |",
        "| ---: | --- | ---: | ---: | ---: | --- |",
    ]
    total_low = 0
    for surah in surahs:
        doc = json.loads((aligned_dir / f"{surah:03d}.json").read_text(encoding="utf-8"))
        ayahs = doc.get("ayahs", [])
        sums: dict[int, list[float]] = {}
        for word in doc.get("words", []):
            if not word.get("basmala"):
                sums.setdefault(int(word["ayah"]), []).append(float(word["confidence"]))
        means = {a: sum(v) / len(v) for a, v in sums.items() if v}
        low = sorted(a for a, c in means.items() if c < LOW_CONFIDENCE)
        total_low += len(low)
        lowest = f"{min(means.values()):.3f}" if means else "n/a"
        low_text = f"{len(low)} ({', '.join(str(a) for a in low)})" if low else "0"
        rows.append(f"| {surah} | {doc.get('source', 'n/a')} | {len(ayahs)} | {len(doc.get('words', []))} | {lowest} | {low_text} |")
    rows.append("")
    rows.append(f"Surahs: {len(surahs)}. Ayahs below {LOW_CONFIDENCE}: {total_low}.")
    return "\n".join(rows) + "\n"
