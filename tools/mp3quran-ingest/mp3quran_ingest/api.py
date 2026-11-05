"""MP3Quran API v3 client (stdlib urllib only; httpx fails the 12-month rule, ADR 0061 / plan A4)."""

from __future__ import annotations

import http.client
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from .config import DEFAULT_API_BASE
from .errors import ApiError

USER_AGENT = "mp3quran-ingest/0.1 (Taybah local ingest, ADR 0061)"


class Mp3QuranApi:
    def __init__(self, base_url: str = DEFAULT_API_BASE, timeout: float = 60.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get_json(self, path: str, **params: str) -> Any:
        query = urllib.parse.urlencode(params)
        url = f"{self.base_url}/{path}" + (f"?{query}" if query else "")
        request = urllib.request.Request(
            url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read()
        except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
            raise ApiError(f"MP3Quran API request failed: {path}: {exc}") from exc
        try:
            return json.loads(body.decode("utf-8"))
        except ValueError as exc:
            raise ApiError(f"MP3Quran API returned invalid JSON: {path}") from exc

    def reciters(self, language: str) -> list[dict[str, Any]]:
        data = self.get_json("reciters", language=language)
        return list(data["reciters"])

    def riwayat(self, language: str) -> list[dict[str, Any]]:
        data = self.get_json("riwayat", language=language)
        return list(data["riwayat"])

    def ayat_timing_reads(self) -> list[dict[str, Any]]:
        return list(self.get_json("ayat_timing/reads"))
