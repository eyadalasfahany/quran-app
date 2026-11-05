"""Local review server: stdlib http.server, bound to 127.0.0.1 only. Developer tool, never deployed.

Routes:
  GET  /                  the review page
  GET  /audio/NNN.mp3     surah audio with HTTP Range support (206 partial content, 416 when unsatisfiable)
  GET  /api/list          the review list (review-list output)
  GET  /api/marks         the marks file
  GET  /api/stretch/NNN:a-b   the aligner's token timings for one stretch (from the v7 folder)
  POST /api/marks         replace the marks file (validated, written atomically)
"""

import json
import re
import threading
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from .marks import load_marks, save_marks, validate_marks
from .review import stretch_detail
from .review_page import PAGE

HOST = "127.0.0.1"
DEFAULT_PORT = 8765
MAX_BODY = 1_000_000
CHUNK = 64 * 1024
AUDIO_PATH = re.compile(r"/audio/([0-9]{3})\.mp3")
STRETCH_PATH = re.compile(r"/api/stretch/([0-9]{3}:[0-9]+-[0-9]+)")
DEFAULT_WORDS_DIR = Path("out/253-v7")
UNSATISFIABLE = "unsatisfiable"


@dataclass
class ReviewContext:
    list_data: dict
    marks_path: Path
    audio_dir: Path
    words_dir: Path
    lock: threading.Lock


def parse_byte_range(header: str, size: int):
    """(start, end) inclusive for a single `bytes=` range, UNSATISFIABLE, or None to ignore the header."""
    m = re.fullmatch(r"bytes=([0-9]*)-([0-9]*)", header.strip())
    if not m:
        return None
    first, last = m.group(1), m.group(2)
    if first == "" and last == "":
        return None
    if first == "":  # suffix: the last N bytes
        n = int(last)
        if n == 0 or size == 0:
            return UNSATISFIABLE
        return max(0, size - n), size - 1
    start = int(first)
    if start >= size:
        return UNSATISFIABLE
    end = min(int(last), size - 1) if last else size - 1
    if end < start:
        return None
    return start, end


def make_server(list_path: Path, marks_path: Path, audio_dir: Path, port: int = DEFAULT_PORT,
                words_dir: Path = DEFAULT_WORDS_DIR) -> ThreadingHTTPServer:
    """A bound server (not yet serving). Port 0 picks a free port."""
    if not list_path.is_file():
        raise FileNotFoundError(f"review list not found: {list_path} (run review-list first)")
    list_data = json.loads(list_path.read_text(encoding="utf-8"))
    server = ThreadingHTTPServer((HOST, port), _Handler)
    server.daemon_threads = True
    server.review = ReviewContext(list_data, marks_path, audio_dir, words_dir, threading.Lock())
    return server


def serve(list_path: Path, marks_path: Path, audio_dir: Path, port: int = DEFAULT_PORT,
          words_dir: Path = DEFAULT_WORDS_DIR) -> None:
    server = make_server(list_path, marks_path, audio_dir, port, words_dir)
    print(f"review page: http://{HOST}:{server.server_address[1]}/", flush=True)
    print(f"marks: {marks_path}  (saved on every change; Ctrl-C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


class _Handler(BaseHTTPRequestHandler):
    server_version = "recitation-review"

    def log_message(self, format, *args):  # keep the terminal for the developer's own output
        return

    @property
    def ctx(self) -> ReviewContext:
        return self.server.review

    def _send(self, status: int, body: bytes, content_type: str, extra: dict | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, data) -> None:
        self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        try:
            path = urlsplit(self.path).path
            if path == "/":
                self._send(200, PAGE.encode("utf-8"), "text/html; charset=utf-8")
            elif path == "/api/list":
                self._json(200, self.ctx.list_data)
            elif path == "/api/marks":
                with self.ctx.lock:
                    data = load_marks(self.ctx.marks_path)
                self._json(200, data)
            elif AUDIO_PATH.fullmatch(path):
                self._audio(AUDIO_PATH.fullmatch(path).group(1))
            elif STRETCH_PATH.fullmatch(unquote(path)):
                self._stretch(STRETCH_PATH.fullmatch(unquote(path)).group(1))
            else:
                self._json(404, {"error": "not found"})
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        try:
            path = urlsplit(self.path).path
            if path != "/api/marks":
                self._json(404, {"error": "not found"})
                return
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_BODY:
                self._json(400, {"error": "body must be 1 to 1000000 bytes"})
                return
            raw = self.rfile.read(length)
            try:
                data = validate_marks(json.loads(raw.decode("utf-8")))
            except (ValueError, UnicodeDecodeError) as exc:
                self._json(400, {"error": str(exc)})
                return
            with self.ctx.lock:
                save_marks(self.ctx.marks_path, data)
            self._json(200, {"ok": True})
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _stretch(self, stretch_id: str) -> None:
        stretch = next((s for s in self.ctx.list_data["stretches"] if s["id"] == stretch_id), None)
        if stretch is None:
            self._json(404, {"error": "stretch not in the review list"})
            return
        path = self.ctx.words_dir / f"{stretch['surah']:03d}.json"
        if not path.is_file():
            self._json(404, {"error": "aligner output not found"})
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        texts = {r["ayah"]: r["text"] for r in stretch["ayahs"]}
        self._json(200, {"id": stretch["id"], "surah": stretch["surah"], "lo": stretch["lo"], "hi": stretch["hi"],
                         "ayahs": stretch_detail(data, texts, stretch["lo"], stretch["hi"])})

    def _audio(self, surah: str) -> None:
        path = self.ctx.audio_dir / f"{surah}.mp3"
        if not path.is_file():
            self._json(404, {"error": "audio not found"})
            return
        size = path.stat().st_size
        header = self.headers.get("Range")
        parsed = parse_byte_range(header, size) if header else None
        if parsed == UNSATISFIABLE:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if parsed is None:
            start, end, status = 0, size - 1, 200
            extra = {"Accept-Ranges": "bytes"}
        else:
            start, end = parsed
            status = 206
            extra = {"Accept-Ranges": "bytes", "Content-Range": f"bytes {start}-{end}/{size}"}
        length = 0 if size == 0 else end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(length))
        for k, v in extra.items():
            self.send_header(k, v)
        self.end_headers()
        with path.open("rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(CHUNK, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)
