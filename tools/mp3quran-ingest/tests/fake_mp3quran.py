"""Local stand-in for the MP3Quran API and CDN, served from a thread on 127.0.0.1. No network."""

from __future__ import annotations

import hashlib
import json
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


class FakeMp3Quran:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}  # URL path -> bytes
        self.truncate: set[str] = set()  # URL paths whose GET is cut halfway
        self.requests: list[tuple[str, str, str | None]] = []  # (method, path, Range)
        self.reciters: dict[str, list[dict[str, Any]]] = {"ar": [], "eng": []}
        self.riwayat: dict[str, list[dict[str, str]]] = {"ar": [], "eng": []}
        self.reads: list[dict[str, Any]] = []
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self._server.fake = self  # type: ignore[attr-defined]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    @property
    def host(self) -> str:
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    @property
    def api_base(self) -> str:
        return f"{self.host}/api/v3"

    def audio_folder(self, name: str) -> str:
        return f"{self.host}/audio/{name}/"

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()


class _Handler(BaseHTTPRequestHandler):
    server_version = "FakeMp3Quran/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:  # keep test output quiet
        return

    def do_HEAD(self) -> None:
        self._serve(head=True)

    def do_GET(self) -> None:
        self._serve(head=False)

    def _send_json(self, payload: Any, head: bool) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _serve(self, head: bool) -> None:
        fake: FakeMp3Quran = self.server.fake  # type: ignore[attr-defined]
        parsed = urllib.parse.urlsplit(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        fake.requests.append((self.command, parsed.path, self.headers.get("Range")))

        if parsed.path == "/api/v3/reciters":
            language = query.get("language", ["ar"])[0]
            self._send_json({"reciters": fake.reciters[language]}, head)
            return
        if parsed.path == "/api/v3/riwayat":
            language = query.get("language", ["ar"])[0]
            self._send_json({"riwayat": fake.riwayat[language]}, head)
            return
        if parsed.path == "/api/v3/ayat_timing/reads":
            self._send_json(fake.reads, head)
            return
        if parsed.path in fake.files:
            self._send_file(fake, parsed.path, head)
            return
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _send_file(self, fake: FakeMp3Quran, path: str, head: bool) -> None:
        data = fake.files[path]
        start = 0
        status = 200
        range_header = self.headers.get("Range")
        if range_header and range_header.startswith("bytes=") and not head:
            start = int(range_header[len("bytes=") :].split("-")[0])
            status = 206
        body = data[start:]
        self.send_response(status)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", f'"{hashlib.md5(data).hexdigest()}"')
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{len(data) - 1}/{len(data)}")
        if head:
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            return
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if path in fake.truncate:
            self.wfile.write(body[: len(body) // 2])
            self.close_connection = True
            return
        self.wfile.write(body)
