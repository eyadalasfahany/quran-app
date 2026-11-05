"""Catalogue snapshot: reciters (ar and eng), riwayat (ar and eng), ayat_timing/reads."""

from __future__ import annotations

from typing import Any

from .api import Mp3QuranApi
from .manifest import SOURCE

CATALOGUE_SCHEMA = 1


def _by_id(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(items, key=lambda item: int(item["id"]))
    for item in ordered:
        if isinstance(item.get("moshaf"), list):
            item["moshaf"] = sorted(item["moshaf"], key=lambda m: int(m["id"]))
    return ordered


def build_catalogue(api: Mp3QuranApi, fetched_at: str) -> dict[str, Any]:
    return {
        "schema": CATALOGUE_SCHEMA,
        "source": SOURCE,
        "api_base": api.base_url,
        "fetched_at": fetched_at,
        "reciters": {"ar": _by_id(api.reciters("ar")), "eng": _by_id(api.reciters("eng"))},
        "riwayat": {"ar": _by_id(api.riwayat("ar")), "eng": _by_id(api.riwayat("eng"))},
        "ayat_timing_reads": _by_id(api.ayat_timing_reads()),
    }
