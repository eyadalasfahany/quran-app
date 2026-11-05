"""Surah file transfer: HEAD for Content-Length and ETag, resumable GET with a `.part` file."""

from __future__ import annotations

import http.client
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .api import USER_AGENT
from .errors import DownloadError, TruncatedDownload

CHUNK = 1 << 20


@dataclass(frozen=True)
class RemoteFile:
    url: str
    content_length: int
    etag: str | None


def head_file(url: str, timeout: float = 60.0) -> RemoteFile:
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            headers = response.headers
    except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
        raise DownloadError(f"HEAD failed for {url}: {exc}") from exc
    length = headers.get("Content-Length")
    if length is None or not length.isdigit():
        raise DownloadError(f"no Content-Length from {url}")
    return RemoteFile(url=url, content_length=int(length), etag=headers.get("ETag"))


def download_file(url: str, final: Path, expected_bytes: int, timeout: float = 60.0) -> None:
    """Fetch `url` into `final`. Resumes from `final.part`; renames only when the size matches.

    A short result is kept as `.part` so the next run resumes; an oversized one is discarded.
    """
    if final.is_file() and final.stat().st_size == expected_bytes:
        return
    final.parent.mkdir(parents=True, exist_ok=True)
    part = final.with_name(final.name + ".part")
    offset = part.stat().st_size if part.is_file() else 0
    if offset > expected_bytes:
        part.unlink()
        offset = 0
    if offset < expected_bytes:
        headers = {"User-Agent": USER_AGENT}
        if offset:
            headers["Range"] = f"bytes={offset}-"
        request = urllib.request.Request(url, headers=headers)
        try:
            response = urllib.request.urlopen(request, timeout=timeout)
        except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
            raise DownloadError(f"GET failed for {url}: {exc}") from exc
        with response:
            # A server that ignores Range answers 200 with the whole file: start again.
            append = offset > 0 and response.status == 206
            with part.open("ab" if append else "wb") as handle:
                try:
                    while chunk := response.read(CHUNK):
                        handle.write(chunk)
                except (http.client.HTTPException, OSError) as exc:
                    raise TruncatedDownload(f"download interrupted for {url}: {exc}") from exc
    size = part.stat().st_size
    if size > expected_bytes:
        part.unlink()
        raise TruncatedDownload(f"{final.name}: {size} bytes, source says {expected_bytes}")
    if size < expected_bytes:
        raise TruncatedDownload(
            f"{final.name}: {size} of {expected_bytes} bytes; kept as .part, run again to resume"
        )
    os.replace(part, final)
