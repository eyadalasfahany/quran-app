"""Reciter sources: where a recitation's surah files come from (ADR 0074 decisions 4, 5, 9 and 10).

The pipeline is written against `ReciterSource`. A source gives the manifest record of one reciter,
the URL of each surah file, the R2 key prefix, the manifest `source` string and the copy modes it
allows. MP3Quran is the only adapter here; Way2Quran plugs in the same way (plan step 5).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from .api import Mp3QuranApi
from .errors import IngestError
from .keys import KEY_PREFIX

HAFS_REWAYA_ID = 1
SURAH_COUNT = 114
COPY_MODES = frozenset({"worker", "s3"})  # --via values; a source allows a subset


class ReciterSource(Protocol):
    source: str  # the manifest's top-level `source` string
    key_prefix: str  # R2 key prefix, no trailing slash: `{prefix}/{id}/{NNN}-{sha[:16]}.mp3`
    copy_modes: frozenset[str]  # which --via modes this source allows
    record_last_modified: bool  # keep the source's Last-Modified in each file entry
    meta: dict[str, Any]  # the manifest record of one reciter (moshaf), without `files`

    def source_url(self, surah: int) -> str: ...


@dataclass(frozen=True)
class Mp3QuranSource:
    """One MP3Quran moshaf. `source_url` is `{server}{NNN}.mp3`, as before this refactor."""

    meta: dict[str, Any]
    source: str = "mp3quran"
    key_prefix: str = KEY_PREFIX
    copy_modes: frozenset[str] = COPY_MODES
    # MP3Quran manifests stay byte-identical: the CDN's Last-Modified is not recorded.
    record_last_modified: bool = False

    def source_url(self, surah: int) -> str:
        return f"{self.meta['server']}{surah:03}.mp3"


def find_moshaf(api: Mp3QuranApi, moshaf_id: int) -> dict[str, Any]:
    """Return the moshaf metadata that goes into the manifest (names in both languages)."""
    reciters_ar = api.reciters("ar")
    reciters_en = {str(r["id"]): r for r in api.reciters("eng")}
    riwayat_ar = {int(r["id"]): r["name"] for r in api.riwayat("ar")}
    for reciter in reciters_ar:
        for moshaf in reciter.get("moshaf", []):
            if int(moshaf["id"]) != moshaf_id:
                continue
            if int(moshaf["rewaya_id"]) != HAFS_REWAYA_ID:
                raise IngestError(
                    f"moshaf {moshaf_id} is not Hafs (rewaya_id {moshaf['rewaya_id']}); "
                    "only Hafs is ingested in v1 (ADR 0061 §10)"
                )
            english = reciters_en.get(str(reciter["id"]))
            if english is None:
                raise IngestError(f"reciter {reciter['id']} is missing from the English list")
            server = str(moshaf["server"])
            if not server.endswith("/"):
                raise IngestError(f"moshaf {moshaf_id} server does not end with '/'")
            return {
                "moshaf_id": moshaf_id,
                "reciter_id": int(reciter["id"]),
                "name_ar": reciter["name"],
                "name_en": english["name"],
                "riwayah": riwayat_ar.get(HAFS_REWAYA_ID, ""),
                "moshaf_name": moshaf["name"],
                "server": server,
                "surah_list": parse_surah_list(str(moshaf["surah_list"])),
            }
    raise IngestError(f"moshaf {moshaf_id} is not in the MP3Quran reciters list")


def parse_surah_list(text: str) -> list[int]:
    return sorted(int(part) for part in text.split(",") if part.strip())


def resolve_mp3quran(api: Mp3QuranApi, moshaf_id: int) -> Mp3QuranSource:
    """Look up one Hafs moshaf in the MP3Quran API and wrap it as a source."""
    return Mp3QuranSource(meta=find_moshaf(api, moshaf_id))
