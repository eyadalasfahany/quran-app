"""Object keys and public URLs (ADR 0061 §5)."""

from __future__ import annotations

import string

KEY_PREFIX = "audio/mp3quran"
CACHE_CONTROL = "public, max-age=31536000, immutable"
CONTENT_TYPE = "audio/mpeg"
_HEX = frozenset(string.hexdigits.lower())


def object_key(moshaf_id: int, surah: int, sha256_hex: str) -> str:
    """`audio/mp3quran/{moshaf_id}/{surah:03}-{sha256[:16]}.mp3`: a key never names two byte streams."""
    if not 1 <= surah <= 114:
        raise ValueError(f"surah out of range: {surah}")
    digest = sha256_hex.lower()
    if len(digest) != 64 or not set(digest) <= _HEX:
        raise ValueError("sha256 must be 64 hex characters")
    return f"{KEY_PREFIX}/{moshaf_id}/{surah:03}-{digest[:16]}.mp3"


def public_url(public_base: str, key: str) -> str:
    return f"{public_base.rstrip('/')}/{key}"
