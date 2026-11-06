"""Fault and header fixtures for the fake CDN, patched on its handler class for one test.

Kept apart from fake_mp3quran.py so the existing fake and its users stay unchanged.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from typing import Any
from urllib.parse import urlsplit

import pytest

from .fake_mp3quran import FakeMp3Quran, _Handler

LAST_MODIFIED = "Wed, 04 Nov 2026 10:00:00 GMT"
# Longer than the client timeout a test passes in, so the client gives up before any reply.
STALL_SECONDS = 0.6


@pytest.fixture
def head_faults(fake_server: FakeMp3Quran, monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, list[str]]]:
    """Per URL path, a queue of faults for the next HEAD requests: "stall", or an HTTP status such as "503".

    Each HEAD is recorded in `fake_server.requests` exactly once, faulted or not.
    """
    queues: dict[str, list[str]] = {}
    original: Any = _Handler.do_HEAD

    def do_head(self: _Handler) -> None:
        path = urlsplit(self.path).path
        queue = queues.get(path)
        if not queue:
            original(self)
            return
        fault = queue.pop(0)
        self.server.fake.requests.append(("HEAD", path, None))  # type: ignore[attr-defined]
        if fault == "stall":
            time.sleep(STALL_SECONDS)
            self.close_connection = True
            return
        self.send_response(int(fault))
        self.send_header("Content-Length", "0")
        self.end_headers()

    monkeypatch.setattr(_Handler, "do_HEAD", do_head)
    yield queues


@pytest.fixture
def cdn_headers(fake_server: FakeMp3Quran, monkeypatch: pytest.MonkeyPatch) -> Iterator[set[str]]:
    """Every file answers with Last-Modified. Add a URL path to the yielded set to drop its ETag."""
    drop_etag: set[str] = set()
    original: Any = _Handler.send_header

    def send_header(self: _Handler, keyword: str, value: str) -> None:
        path = urlsplit(self.path).path
        if path.startswith("/audio/") and keyword == "ETag":
            if path not in drop_etag:
                original(self, keyword, value)
            original(self, "Last-Modified", LAST_MODIFIED)
            return
        original(self, keyword, value)

    monkeypatch.setattr(_Handler, "send_header", send_header)
    yield drop_etag
