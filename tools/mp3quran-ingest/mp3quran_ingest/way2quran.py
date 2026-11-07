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
from dataclasses import dataclass
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
_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_FILE = re.compile(r"([0-9]{1,3})\.mp3")
_DELIMITERS = r"\s\"'<>\\?#,)"


def page_url_for(slug: str, site_base: str | None = None) -> str:
    return f"{(site_base or SITE_BASE).rstrip('/')}/ar/reciters/{slug}"


def media_url(slug: str, file_name: str, media_base: str | None = None) -> str:
    return f"{(media_base or MEDIA_BASE).rstrip('/')}/{slug}/{RIWAYAH_FOLDER}/{file_name}"


@dataclass(frozen=True)
class Way2QuranReciter:
    reciter_id: int
    slug: str
    name_ar: str
    name_en: str
    moshaf_name: str
    files: dict[int, str]  # surah -> exact file name, sorted by surah

    def file_for(self, surah: int) -> str:
        name = self.files.get(surah)
        if name is None:
            raise IngestError(f"surah {surah} is not in the Way2Quran list of reciter {self.reciter_id}")
        return name

    def to_json(self) -> dict[str, Any]:
        return {
            "reciter_id": self.reciter_id,
            "slug": self.slug,
            "riwayah_folder": RIWAYAH_FOLDER,
            "name_ar": self.name_ar,
            "name_en": self.name_en,
            "moshaf_name": self.moshaf_name,
            "page_url": page_url_for(self.slug),
            "files": {str(surah): name for surah, name in sorted(self.files.items())},
        }


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


def parse_reciter(raw: Any) -> Way2QuranReciter:
    """Validate one reciter entry. Every refusal names the reciter id, never a value of the text fields."""
    if not isinstance(raw, dict):
        raise IngestError("a reciter entry must be an object")
    if set(raw) != RECITER_KEYS:
        raise IngestError(f"a reciter entry must have exactly the keys {sorted(RECITER_KEYS)}")
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
    return Way2QuranReciter(
        reciter_id=reciter_id,
        slug=slug,
        name_ar=name_ar,
        name_en=name_en,
        moshaf_name=moshaf_name,
        files=_parse_files(reciter_id, raw["files"]),
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
    for surah, name in listing.files.items():
        url = media_url(slug, name, media_base)
        try:
            remote = head(url)
            check_remote(url, remote)
        except IngestError as exc:
            raise IngestError(f"entry refused: surah {surah}: {exc}") from exc
        total += remote.content_length
    return ListResult(reciter=entry, ignored=listing.ignored, total_bytes=total)


def to_document(reciters: list[Way2QuranReciter]) -> dict[str, Any]:
    return {"schema": SCHEMA, "reciters": [r.to_json() for r in sorted(reciters, key=lambda r: r.reciter_id)]}


def write_reciter(path: Path, reciter: Way2QuranReciter) -> None:
    """Add or replace one reciter, keep the others, validate the whole file, then write it atomically."""
    current = load_reciters(path) if path.is_file() else []
    merged = [r for r in current if r.reciter_id != reciter.reciter_id] + [reciter]
    doc = to_document(merged)
    parse_document(doc)
    write_json_atomic(path, doc, sort_keys=False)
