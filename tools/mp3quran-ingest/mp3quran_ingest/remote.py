"""Surah file transfer: HEAD for Content-Length and ETag, resumable GET with a `.part` file."""

from __future__ import annotations

import http.client
import os
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from .api import USER_AGENT
from .errors import DownloadError, TruncatedDownload

CHUNK = 1 << 20
# Seconds to wait before each retry of a HEAD. Three entries = three retries after the first attempt.
HEAD_BACKOFF_SECONDS: tuple[float, ...] = (2.0, 4.0, 8.0)
RETRY_STATUSES = frozenset(range(500, 600))  # 5xx only; 404 and other 4xx are never retried


@dataclass(frozen=True)
class RemoteFile:
    url: str
    content_length: int
    etag: str | None
    last_modified: str | None = None  # the header as sent (an HTTP date), or None
    content_type: str | None = None  # as sent; Way2Quran checks audio/mpeg (ADR 0074 plan step 6)
    final_url: str | None = None  # after redirects; a Way2Quran entry refuses any redirect
    status: int | None = None


class _Transient(Exception):
    """A HEAD failure worth another attempt. Internal: never escapes head_file."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def head_file(
    url: str,
    timeout: float = 60.0,
    *,
    backoff: tuple[float, ...] = HEAD_BACKOFF_SECONDS,
    sleep: Callable[[float], None] = time.sleep,
) -> RemoteFile:
    """HEAD the source file. Retries 5xx, timeouts and connection errors; never retries a 4xx."""
    for attempt in range(len(backoff) + 1):
        try:
            return _head_once(url, timeout)
        except _Transient as exc:
            if attempt == len(backoff):
                raise DownloadError(
                    f"HEAD failed for {url} after {attempt + 1} attempts ({exc.reason})"
                ) from None
            sleep(backoff[attempt])
    raise AssertionError("unreachable")  # pragma: no cover


def _head_once(url: str, timeout: float) -> RemoteFile:
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            headers = response.headers
            status = response.status
            final_url = response.geturl()
    except urllib.error.HTTPError as exc:  # before URLError: HTTPError is a subclass of it
        status = exc.code
        exc.close()
        if status in RETRY_STATUSES:
            raise _Transient(f"HTTP {status}") from None
        raise DownloadError(f"HEAD failed for {url}: HTTP {status}") from None
    except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
        # Covers timeouts (TimeoutError is an OSError) and connection failures; names the class only.
        raise _Transient(f"network error {type(exc).__name__}") from None
    length = headers.get("Content-Length")
    if length is None or not length.isdigit():
        raise DownloadError(f"no Content-Length from {url}")
    return RemoteFile(
        url=url,
        content_length=int(length),
        etag=headers.get("ETag"),
        last_modified=headers.get("Last-Modified"),
        content_type=headers.get("Content-Type"),
        final_url=final_url,
        status=status,
    )


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
