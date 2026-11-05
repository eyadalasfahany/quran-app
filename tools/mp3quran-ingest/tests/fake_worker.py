"""Local stand-in for the copy Worker's `POST /copy` (tools/r2-copy-worker/README.md). No network.

By default it behaves like the real Worker: token check, request validation, 201 copied,
200 exists, 409 on a size conflict. `script` overrides the next responses in order:
("status", code, body) answers with that code, ("sleep", seconds) stalls past the client
timeout and then answers 503 (nobody is listening by then), ("default",) uses the default.
On a copy, `on_copy(key, size)` runs so a test can write the object into a mock bucket.
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

KEY_PATTERN = re.compile(r"^audio/mp3quran/\d+/\d{3}-[0-9a-f]{16}\.mp3$")
SHA_PATTERN = re.compile(r"^[0-9a-f]{64}$")
FIELDS = {"source_url", "key", "bytes", "sha256"}


class FakeWorker:
    def __init__(self, token: str) -> None:
        self.token = token
        self.script: list[tuple[Any, ...]] = []
        self.requests: list[dict[str, Any]] = []  # method, path, auth, content_type, length, body
        self.objects: dict[str, int] = {}  # what the default path has "copied": key -> size
        self.on_copy: Callable[[str, int], None] | None = None
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self._server.daemon_threads = True
        self._server.fake = self  # type: ignore[attr-defined]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()


class _Handler(BaseHTTPRequestHandler):
    server_version = "FakeWorker/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send(self, status: int, body: dict[str, Any] | None) -> None:
        raw = b"" if body is None else json.dumps(body).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except OSError:
            pass  # the client already gave up (timeout scenario)

    def do_POST(self) -> None:
        fake: FakeWorker = self.server.fake  # type: ignore[attr-defined]
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length)
        fake.requests.append({
            "method": self.command,
            "path": self.path,
            "auth": self.headers.get("Authorization"),
            "content_type": self.headers.get("Content-Type"),
            "length": length,
            "body": raw,
        })
        step = fake.script.pop(0) if fake.script else ("default",)
        if step[0] == "status":
            self._send(step[1], step[2])
            return
        if step[0] == "sleep":
            time.sleep(step[1])
            self._send(503, {"error": "too late"})
            return
        self._default(fake, raw)

    def _default(self, fake: FakeWorker, raw: bytes) -> None:
        if self.path != "/copy":
            self._send(404, {"error": "not found"})
            return
        if self.headers.get("Authorization") != f"Bearer {fake.token}":
            self._send(401, {"error": "unauthorised"})
            return
        try:
            body = json.loads(raw.decode("utf-8"))
        except ValueError:
            self._send(400, {"error": "body must be valid JSON"})
            return
        if not isinstance(body, dict) or set(body) != FIELDS:
            self._send(400, {"error": "body must have exactly source_url, key, bytes, sha256"})
            return
        key, size, sha = body["key"], body["bytes"], body["sha256"]
        if not isinstance(key, str) or not KEY_PATTERN.match(key):
            self._send(400, {"error": "key must match audio/mp3quran/{id}/{surah}-{sha256[:16]}.mp3"})
            return
        if type(size) is not int or size <= 0:
            self._send(400, {"error": "bytes must be a positive integer"})
            return
        if not isinstance(sha, str) or not SHA_PATTERN.match(sha):
            self._send(400, {"error": "sha256 must be 64 lowercase hex characters"})
            return
        if key[key.rfind("-") + 1 : key.rfind("-") + 17] != sha[:16]:
            self._send(400, {"error": "key hash does not match sha256"})
            return
        if key in fake.objects:
            if fake.objects[key] == size:
                self._send(200, {"status": "exists", "key": key, "size": size})
            else:
                self._send(409, {"error": "an object with this key exists with a different size"})
            return
        fake.objects[key] = size
        if fake.on_copy is not None:
            fake.on_copy(key, size)
        self._send(201, {"status": "copied", "key": key, "size": size, "etag": "fake-etag"})
