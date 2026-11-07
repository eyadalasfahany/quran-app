"""Way2Quran reciters (ADR 0074 decisions 3, 5, 7, 8 and 10; plan steps 5 and 6).

The reciter page embeds each file's URL, but file names are not uniform (`79.mp3` next to `001.mp3`), so the
committed data file `way2quran_reciters.json` lists each reciter's exact file names per surah. No URL is stored
in it: the adapter builds `{media}/{slug}/hafs-an-asim/{file}` and nothing else. The lister reads the reciter page,
keeps the Hafs files, HEADs each one and writes the entry for review. A new reciter is data only.
"""

from __future__ import annotations

import http.client
import json
import re
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any

from .api import USER_AGENT
from .config import DEFAULT_WAY2QURAN_DATA
from .errors import IngestError
from .manifest import write_json_atomic
from .remote import RemoteFile, head_file

SCHEMA = 1
SOURCE = "way2quran"
KEY_PREFIX = "audio/way2quran"
SITE_BASE = "https://way2quran.com"
MEDIA_BASE = "https://media.way2quran.com"
RIWAYAH_FOLDER = "hafs-an-asim"
RIWAYAH_AR = "حفص عن عاصم"
MOSHAF_SUFFIX = " - مرتل"  # the importer reads the style from the text after the last " - "
SURAH_COUNT = 114
COPY_MODES = frozenset({"s3"})  # the copy Worker is pinned to MP3Quran (ADR 0074 decision 9)
RECITER_KEYS = frozenset(
    {"reciter_id", "slug", "riwayah_folder", "name_ar", "name_en", "moshaf_name", "page_url", "files"}
)
EXCLUDED_REASONS = frozenset(
    {"incomplete-start", "incomplete-end", "incomplete-both", "incomplete-middle", "unverified"}
)
EXCLUDED_KEYS = (
    "file", "sha256", "bytes", "source_last_modified", "reason", "first_heard_ayah", "last_heard_ayah",
    "ayah_count", "check", "run_id",
)
_HEX64 = re.compile(r"[0-9a-f]{64}")
_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_FILE = re.compile(r"([0-9]{1,3})\.mp3")
_DELIMITERS = r"\s\"'<>\\?#,)"


def page_url_for(slug: str, site_base: str | None = None) -> str:
    return f"{(site_base or SITE_BASE).rstrip('/')}/ar/reciters/{slug}"


def media_url(slug: str, file_name: str, media_base: str | None = None) -> str:
    return f"{(media_base or MEDIA_BASE).rstrip('/')}/{slug}/{RIWAYAH_FOLDER}/{file_name}"


@dataclass(frozen=True)
class ExcludedFile:
    """A source file the quality check found incomplete (ADR 0077). It is out of `files` until the source changes."""

    file: str
    sha256: str
    bytes: int
    source_last_modified: str | None  # the Last-Modified header as sent
    reason: str
    first_heard_ayah: int | None
    last_heard_ayah: int | None
    ayah_count: int
    check: str
    run_id: str

    def to_json(self) -> dict[str, Any]:
        return {name: getattr(self, name) for name in EXCLUDED_KEYS}


@dataclass(frozen=True)
class Way2QuranReciter:
    reciter_id: int
    slug: str
    name_ar: str
    name_en: str
    moshaf_name: str
    files: dict[int, str]  # surah -> exact file name, sorted by surah
    excluded: dict[int, ExcludedFile] = field(default_factory=dict)  # surah -> record, sorted by surah

    def file_for(self, surah: int) -> str:
        name = self.files.get(surah)
        if name is None:
            raise IngestError(f"surah {surah} is not in the Way2Quran list of reciter {self.reciter_id}")
        return name

    def to_json(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "reciter_id": self.reciter_id,
            "slug": self.slug,
            "riwayah_folder": RIWAYAH_FOLDER,
            "name_ar": self.name_ar,
            "name_en": self.name_en,
            "moshaf_name": self.moshaf_name,
            "page_url": page_url_for(self.slug),
            "files": {str(surah): name for surah, name in sorted(self.files.items())},
        }
        if self.excluded:  # absent when empty, so a file without exclusions stays byte-identical
            out["excluded"] = {str(surah): rec.to_json() for surah, rec in sorted(self.excluded.items())}
        return out


def _text(raw: dict[str, Any], name: str, reciter_id: Any) -> str:
    value = raw[name]
    if not isinstance(value, str) or not value.strip():
        raise IngestError(f"reciter {reciter_id}: {name} must be a non-empty string")
    return value


def _parse_files(reciter_id: int, raw: Any) -> dict[int, str]:
    if not isinstance(raw, dict) or not raw:
        raise IngestError(f"reciter {reciter_id}: files must be a non-empty object of surah to file name")
    files: dict[int, str] = {}
    for key, name in raw.items():
        if not isinstance(key, str) or not key.isdigit() or str(int(key)) != key:
            raise IngestError(f"reciter {reciter_id}: surah key {key!r} must be a plain integer")
        surah = int(key)
        if not 1 <= surah <= SURAH_COUNT:
            raise IngestError(f"reciter {reciter_id}: surah {surah} is outside 1 to {SURAH_COUNT}")
        match = _FILE.fullmatch(name) if isinstance(name, str) else None
        if match is None:
            raise IngestError(f"reciter {reciter_id}: surah {surah} has a file name that is not NNN.mp3")
        if int(match.group(1)) != surah:
            raise IngestError(f"reciter {reciter_id}: file {name} is listed under surah {surah}")
        files[surah] = name
    if len(set(files.values())) != len(files):
        raise IngestError(f"reciter {reciter_id}: a file name is listed twice")
    return dict(sorted(files.items()))


def _opt_ayah(reciter_id: int, surah: int, raw: dict[str, Any], name: str) -> int | None:
    value = raw[name]
    if value is not None and (type(value) is not int or value < 1):
        raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: {name} must be a positive integer or null")
    return value


def _parse_excluded(reciter_id: int, raw: Any, files: dict[int, str]) -> dict[int, ExcludedFile]:
    if not isinstance(raw, dict):
        raise IngestError(f"reciter {reciter_id}: excluded must be an object of surah to record")
    out: dict[int, ExcludedFile] = {}
    for key, rec in raw.items():
        if not isinstance(key, str) or not key.isdigit() or str(int(key)) != key:
            raise IngestError(f"reciter {reciter_id}: excluded surah key {key!r} must be a plain integer")
        surah = int(key)
        if not 1 <= surah <= SURAH_COUNT:
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah} is outside 1 to {SURAH_COUNT}")
        if surah in files:
            raise IngestError(f"reciter {reciter_id}: surah {surah} is in both files and excluded")
        if not isinstance(rec, dict) or set(rec) != set(EXCLUDED_KEYS):
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah} must have exactly the keys {sorted(EXCLUDED_KEYS)}")
        match = _FILE.fullmatch(rec["file"]) if isinstance(rec["file"], str) else None
        if match is None or int(match.group(1)) != surah:
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah} has a file name that is not its NNN.mp3")
        if rec["reason"] not in EXCLUDED_REASONS:
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah} has an unknown reason")
        if not isinstance(rec["sha256"], str) or not _HEX64.fullmatch(rec["sha256"]):
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: sha256 must be 64 hex characters")
        if type(rec["bytes"]) is not int or rec["bytes"] < 0:
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: bytes must be an integer")
        modified = rec["source_last_modified"]
        if modified is not None and not isinstance(modified, str):
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: source_last_modified must be text or null")
        if type(rec["ayah_count"]) is not int or rec["ayah_count"] < 1:
            raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: ayah_count must be a positive integer")
        for name in ("check", "run_id"):
            if not isinstance(rec[name], str) or not rec[name]:
                raise IngestError(f"reciter {reciter_id}: excluded surah {surah}: {name} must be non-empty text")
        out[surah] = ExcludedFile(
            file=rec["file"], sha256=rec["sha256"], bytes=rec["bytes"], source_last_modified=modified,
            reason=rec["reason"], first_heard_ayah=_opt_ayah(reciter_id, surah, rec, "first_heard_ayah"),
            last_heard_ayah=_opt_ayah(reciter_id, surah, rec, "last_heard_ayah"), ayah_count=rec["ayah_count"],
            check=rec["check"], run_id=rec["run_id"],
        )
    return dict(sorted(out.items()))


def parse_reciter(raw: Any) -> Way2QuranReciter:
    """Validate one reciter entry. Every refusal names the reciter id, never a value of the text fields."""
    if not isinstance(raw, dict):
        raise IngestError("a reciter entry must be an object")
    if not RECITER_KEYS <= set(raw) <= RECITER_KEYS | {"excluded"}:
        raise IngestError(
            f"a reciter entry must have exactly the keys {sorted(RECITER_KEYS)}, plus an optional excluded"
        )
    reciter_id = raw["reciter_id"]
    if type(reciter_id) is not int or reciter_id < 1:
        raise IngestError("reciter_id must be an integer of 1 or more")
    slug = _text(raw, "slug", reciter_id)
    if not _SLUG.fullmatch(slug):
        raise IngestError(f"reciter {reciter_id}: slug must be lowercase letters, digits and hyphens")
    if raw["riwayah_folder"] != RIWAYAH_FOLDER:
        raise IngestError(f"reciter {reciter_id}: riwayah_folder must be {RIWAYAH_FOLDER} (Hafs only, ADR 0074 decision 3)")
    name_ar = _text(raw, "name_ar", reciter_id)
    name_en = _text(raw, "name_en", reciter_id)
    moshaf_name = _text(raw, "moshaf_name", reciter_id)
    if not moshaf_name.endswith(MOSHAF_SUFFIX):
        raise IngestError(f"reciter {reciter_id}: moshaf_name must end with the style suffix")
    if raw["page_url"] != page_url_for(slug):
        raise IngestError(f"reciter {reciter_id}: page_url must be the reciter page of its slug")
    files = _parse_files(reciter_id, raw["files"])
    excluded = _parse_excluded(reciter_id, raw["excluded"], files) if "excluded" in raw else {}
    return Way2QuranReciter(
        reciter_id=reciter_id,
        slug=slug,
        name_ar=name_ar,
        name_en=name_en,
        moshaf_name=moshaf_name,
        files=files,
        excluded=excluded,
    )


def parse_document(doc: Any) -> list[Way2QuranReciter]:
    if not isinstance(doc, dict) or set(doc) != {"schema", "reciters"} or doc["schema"] != SCHEMA:
        raise IngestError(f"the reciter data file must be schema {SCHEMA} with exactly schema and reciters")
    if not isinstance(doc["reciters"], list):
        raise IngestError("reciters must be a list")
    reciters = [parse_reciter(item) for item in doc["reciters"]]
    if len({r.reciter_id for r in reciters}) != len(reciters):
        raise IngestError("a reciter_id appears twice in the data file")
    if len({r.slug for r in reciters}) != len(reciters):
        raise IngestError("a slug appears twice in the data file")
    return reciters


def _refuse_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """json keeps the last of two equal keys silently; a duplicate surah must be refused instead."""
    seen: dict[str, Any] = {}
    for key, value in pairs:
        if key in seen:
            raise IngestError(f"the data file repeats the key {key!r}")
        seen[key] = value
    return seen


def load_reciters(path: Path | None = None) -> list[Way2QuranReciter]:
    path = path or DEFAULT_WAY2QURAN_DATA
    if not path.is_file():
        raise IngestError(f"the Way2Quran reciter data file is missing: {path}")
    try:
        doc = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_refuse_duplicate_keys)
    except ValueError as exc:
        raise IngestError(f"{path} is not valid JSON") from exc
    return parse_document(doc)


def find_reciter(reciter_id: int, path: Path | None = None) -> Way2QuranReciter:
    for reciter in load_reciters(path):
        if reciter.reciter_id == reciter_id:
            return reciter
    raise IngestError(f"reciter {reciter_id} is not in the Way2Quran reciter data file")


@dataclass(frozen=True)
class Way2QuranSource:
    """The adapter for one Way2Quran reciter. `media_base` is None in production; tests point it at a fake host."""

    reciter: Way2QuranReciter
    media_base: str | None = None
    source: str = SOURCE
    key_prefix: str = KEY_PREFIX
    copy_modes: frozenset[str] = COPY_MODES
    record_last_modified: bool = True  # ADR 0074 decision 5

    @property
    def meta(self) -> dict[str, Any]:
        r = self.reciter
        return {
            "moshaf_id": r.reciter_id,
            "reciter_id": r.reciter_id,
            "name_ar": r.name_ar,
            "name_en": r.name_en,
            "riwayah": RIWAYAH_AR,
            "moshaf_name": r.moshaf_name,
            "surah_list": sorted(r.files),
        }

    def source_url(self, surah: int) -> str:
        return media_url(self.reciter.slug, self.reciter.file_for(surah), self.media_base)


@dataclass(frozen=True)
class PageListing:
    files: dict[int, str]  # Hafs surah -> file name, sorted
    ignored: int  # distinct files of other riwayat on this reciter's page


def _link_pattern(media_base: str) -> re.Pattern[str]:
    base = re.escape(media_base.rstrip("/"))
    return re.compile(rf"{base}/([a-z0-9-]+)/([a-z0-9-]+)/([^/{_DELIMITERS}]+\.mp3)(?![^{_DELIMITERS}])")


def extract_listing(html: str, slug: str, media_base: str | None = None) -> PageListing:
    """Pull the Hafs files of one reciter out of the page HTML.

    Only links whose slug and folder match exactly count: truncated prefixes, other reciters and other
    riwayat are ignored. Repeated links are deduplicated first; two different names for one surah are refused.
    """
    hafs: set[str] = set()
    others: set[tuple[str, str]] = set()
    for match in _link_pattern(media_base or MEDIA_BASE).finditer(html):
        link_slug, folder, name = match.groups()
        if link_slug != slug:
            continue
        if folder == RIWAYAH_FOLDER:
            hafs.add(name)
        else:
            others.add((folder, name))
    files: dict[int, str] = {}
    for name in sorted(hafs):
        match = _FILE.fullmatch(name)
        if match is None:
            raise IngestError(f"a Hafs file name is not NNN.mp3: {name}")
        surah = int(match.group(1))
        if not 1 <= surah <= SURAH_COUNT:
            raise IngestError(f"a Hafs file names surah {surah}, outside 1 to {SURAH_COUNT}")
        if surah in files:
            raise IngestError(f"surah {surah} is listed twice on the page ({files[surah]} and {name})")
        files[surah] = name
    return PageListing(files=dict(sorted(files.items())), ignored=len(others))


def fetch_page(url: str, timeout: float = 60.0) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
    except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
        raise IngestError(f"reciter page request failed ({type(exc).__name__})") from exc
    return body.decode("utf-8", errors="replace")


def check_remote(url: str, remote: RemoteFile) -> None:
    """An entry is refused unless the file answers 200 directly, as audio/mpeg (plan step 6)."""
    if remote.status != 200:
        raise IngestError(f"HTTP {remote.status}, expected 200")
    if remote.final_url != url:
        raise IngestError("the file redirects to another address; refused")
    media_type = (remote.content_type or "").split(";")[0].strip().lower()
    if media_type != "audio/mpeg":
        raise IngestError(f"Content-Type {remote.content_type!r}, expected audio/mpeg")


@dataclass(frozen=True)
class ListResult:
    reciter: Way2QuranReciter
    ignored: int
    total_bytes: int
    # surah -> (Content-Length, Last-Modified as sent), from the HEADs; the carry-forward of exclusions compares them
    remotes: dict[int, tuple[int, str | None]] = field(default_factory=dict)


def list_reciter(
    *,
    slug: str,
    reciter_id: int,
    name_ar: str,
    name_en: str,
    site_base: str | None = None,
    media_base: str | None = None,
    fetch: Callable[[str], str] = fetch_page,
    head: Callable[[str], RemoteFile] = head_file,
) -> ListResult:
    """Read one reciter page, HEAD every Hafs file and return the validated entry. Writes nothing."""
    if not _SLUG.fullmatch(slug):
        raise IngestError("slug must be lowercase letters, digits and hyphens")
    html = fetch(page_url_for(slug, site_base))
    listing = extract_listing(html, slug, media_base)
    if not listing.files:
        raise IngestError(f"no Hafs files on the page of {slug}")
    entry = parse_reciter(
        {
            "reciter_id": reciter_id,
            "slug": slug,
            "riwayah_folder": RIWAYAH_FOLDER,
            "name_ar": name_ar,
            "name_en": name_en,
            "moshaf_name": f"{RIWAYAH_AR}{MOSHAF_SUFFIX}",
            "page_url": page_url_for(slug),
            "files": {str(surah): name for surah, name in listing.files.items()},
        }
    )
    total = 0
    remotes: dict[int, tuple[int, str | None]] = {}
    for surah, name in listing.files.items():
        url = media_url(slug, name, media_base)
        try:
            remote = head(url)
            check_remote(url, remote)
        except IngestError as exc:
            raise IngestError(f"entry refused: surah {surah}: {exc}") from exc
        total += remote.content_length
        remotes[surah] = (remote.content_length, remote.last_modified)
    return ListResult(reciter=entry, ignored=listing.ignored, total_bytes=total, remotes=remotes)


def to_document(reciters: list[Way2QuranReciter]) -> dict[str, Any]:
    return {"schema": SCHEMA, "reciters": [r.to_json() for r in sorted(reciters, key=lambda r: r.reciter_id)]}


def carry_exclusions(
    previous: Way2QuranReciter | None,
    listed: Way2QuranReciter,
    remotes: dict[int, tuple[int, str | None]] | None,
) -> tuple[Way2QuranReciter, list[int]]:
    """Apply the exclusions of `previous` to a fresh listing (ADR 0077).

    A listed file whose name, size and Last-Modified equal the excluded record stays out of `files` and in
    `excluded`. Any other listed file stays in `files` and its surah is returned as changed: the next run checks
    it again. When `remotes` is None the size and date are unknown, so every exclusion counts as changed. An
    exclusion whose file the source no longer lists is dropped without a message.
    """
    files = dict(listed.files)
    excluded: dict[int, ExcludedFile] = {}
    changed: list[int] = []
    for surah, rec in (previous.excluded if previous else {}).items():
        name = files.get(surah)
        if name is None:
            continue
        if remotes is not None and name == rec.file and remotes.get(surah) == (rec.bytes, rec.source_last_modified):
            excluded[surah] = rec
            del files[surah]
        else:
            changed.append(surah)
    return replace(listed, files=dict(sorted(files.items())), excluded=excluded), changed


def stored_reciter(path: Path, reciter_id: int) -> Way2QuranReciter | None:
    if not path.is_file():
        return None
    return next((r for r in load_reciters(path) if r.reciter_id == reciter_id), None)


def write_reciter(
    path: Path,
    reciter: Way2QuranReciter,
    remotes: dict[int, tuple[int, str | None]] | None = None,
) -> list[int]:
    """Add or replace one reciter, keep the others, validate the whole file, then write it atomically.

    With `remotes` (a lister run) the stored exclusions of this reciter are carried forward by
    `carry_exclusions`, and the surahs that changed on the source are returned. Without `remotes` the reciter
    is written as given (the exclude command).
    """
    current = load_reciters(path) if path.is_file() else []
    changed: list[int] = []
    if remotes is not None:
        reciter, changed = carry_exclusions(next((r for r in current if r.reciter_id == reciter.reciter_id), None),
                                            reciter, remotes)
    merged = [r for r in current if r.reciter_id != reciter.reciter_id] + [reciter]
    doc = to_document(merged)
    parse_document(doc)
    write_json_atomic(path, doc, sort_keys=False)
    return changed


def exclude_unavailable(reciter: Way2QuranReciter, report: Any) -> tuple[Way2QuranReciter, list[int]]:
    """Move every surah the quality report calls `unavailable` from `files` to `excluded` (ADR 0077).

    Idempotent: a surah already excluded is left as it is. The report must be for this reciter and name the
    same file as `files`. Returns the new reciter and the surahs moved by this call.
    """
    if not isinstance(report, dict) or report.get("reciter_id") != reciter.reciter_id:
        raise IngestError(f"the report is not for reciter {reciter.reciter_id}")
    surahs = report.get("surahs")
    if not isinstance(surahs, dict):
        raise IngestError("the report has no surahs object")
    files = dict(reciter.files)
    excluded = dict(reciter.excluded)
    moved: list[int] = []
    for key in sorted(surahs, key=lambda k: int(k) if str(k).isdigit() else 0):
        entry = surahs[key]
        if not isinstance(entry, dict) or entry.get("verdict") != "unavailable":
            continue
        surah = int(key)
        if surah in excluded:
            continue
        if surah not in files:
            raise IngestError(f"reciter {reciter.reciter_id}: report surah {surah} is not in files")
        comp = entry.get("completeness")
        if not isinstance(comp, dict) or comp.get("file") != files[surah]:
            raise IngestError(f"reciter {reciter.reciter_id}: report file for surah {surah} is not {files[surah]}")
        excluded[surah] = ExcludedFile(
            file=comp["file"], sha256=entry["sha256"], bytes=comp["bytes"],
            source_last_modified=comp["source_last_modified"], reason=entry["reason"],
            first_heard_ayah=comp["first_heard_ayah"], last_heard_ayah=comp["last_heard_ayah"],
            ayah_count=comp["ayah_count"], check=comp["check"], run_id=str(report.get("run_id")),
        )
        del files[surah]
        moved.append(surah)
    new = replace(reciter, files=dict(sorted(files.items())), excluded=dict(sorted(excluded.items())))
    parse_reciter(new.to_json())  # the same validation the data file gets
    return new, moved
