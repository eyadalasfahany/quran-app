"""Local stand-in for the Way2Quran site and media host, served from a thread on 127.0.0.1. No network.

Pages and files are keyed by URL path. HEAD faults are queued per file path: "stall", "html" (the file with a
text/html type), "redirect" (302 to a copy under /moved), or an HTTP status such as "503".
"""

from __future__ import annotations

import threading
import time
import urllib.parse
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

LAST_MODIFIED = "Wed, 04 Nov 2026 10:00:00 GMT"
STALL_SECONDS = 0.6  # longer than the client timeout a test passes in
REDIRECT_PREFIX = "/moved"


def placeholder_audio(label: str, size: int = 2048) -> bytes:
    """Placeholder bytes, not audio. Tests that need a duration stub the measure."""
    seed = f"FAKE-MP3|{label}|".encode("utf-8")
    return (seed * (size // len(seed) + 1))[:size]


def page_path(slug: str) -> str:
    return f"/ar/reciters/{slug}"


def file_path(slug: str, name: str) -> str:
    return f"/{slug}/hafs-an-asim/{name}"


class FakeWay2Quran:
    def __init__(self) -> None:
        self.pages: dict[str, str] = {}
        self.files: dict[str, bytes] = {}
        self.faults: dict[str, list[str]] = {}
        self.requests: list[tuple[str, str]] = []  # (method, path), every request once
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self._server.fake = self  # type: ignore[attr-defined]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    @property
    def host(self) -> str:
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()

    def head_count(self, path: str) -> int:
        return sum(1 for method, seen in self.requests if method == "HEAD" and seen == path)


class _Handler(BaseHTTPRequestHandler):
    server_version = "FakeWay2Quran/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:  # keep test output quiet
        return

    def do_HEAD(self) -> None:
        self._serve(head=True)

    def do_GET(self) -> None:
        self._serve(head=False)

    def _reply(self, status: int, body: bytes, content_type: str, head: bool, last_modified: bool = False) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if last_modified:
            self.send_header("Last-Modified", LAST_MODIFIED)
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _serve(self, head: bool) -> None:
        fake: FakeWay2Quran = self.server.fake  # type: ignore[attr-defined]
        path = urllib.parse.urlsplit(self.path).path
        fake.requests.append((self.command, path))

        if head and fake.faults.get(path):
            fault = fake.faults[path].pop(0)
            if fault == "stall":
                time.sleep(STALL_SECONDS)
                self.close_connection = True
                return
            if fault == "redirect":
                self.send_response(302)
                self.send_header("Location", f"{REDIRECT_PREFIX}{path}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if fault == "html":
                self._reply(200, fake.files[path], "text/html; charset=utf-8", head, last_modified=True)
                return
            self._reply(int(fault), b"", "text/plain", head)
            return

        if path.startswith(REDIRECT_PREFIX + "/"):
            path = path[len(REDIRECT_PREFIX):]
        if path in fake.pages:
            self._reply(200, fake.pages[path].encode("utf-8"), "text/html; charset=utf-8", head)
            return
        if path in fake.files:
            self._reply(200, fake.files[path], "audio/mpeg", head, last_modified=True)
            return
        self._reply(404, b"", "text/plain", head)


@pytest.fixture
def way2quran_host() -> Iterator[FakeWay2Quran]:
    fake = FakeWay2Quran()
    fake.start()
    try:
        yield fake
    finally:
        fake.stop()
