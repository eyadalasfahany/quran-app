"""Review server on 127.0.0.1 with a free port: routes, Range requests, POST then GET marks. No browser."""

import json
import threading
import urllib.error
import urllib.request

import pytest

from recitation_align.review_server import UNSATISFIABLE, make_server, parse_byte_range

AUDIO = bytes(range(256)) * 4  # 1024 bytes with a known pattern
# Synthetic tokens only (letters from the test alphabet, not Quran text).
AYAH_TEXT = {3: "ابتث ۖ ب", 4: "تاب"}
LIST = {"moshaf": "253", "counts": {"stretches": 1, "ayahs": 2, "surahs": 1},
        "stretches": [{"id": "002:3-4", "surah": 2, "lo": 3, "hi": 4, "audio": "002.mp3", "low_confidence": False,
                       "window": {"start_ms": 0, "end_ms": 9000},
                       "ayahs": [{"ayah": a, "start_ms": 0, "end_ms": 9, "conf": 0.9, "doubtful": False,
                                  "text": AYAH_TEXT[a]} for a in (3, 4)]}]}
WORDS = {"surah": 2, "words": [
    {"surah": 2, "ayah": 3, "position": 1, "word": "ابتث", "start_ms": 100, "end_ms": 300, "confidence": 0.9},
    {"surah": 2, "ayah": 3, "position": 3, "word": "ب", "start_ms": 400, "end_ms": 500, "confidence": 0.9},
    {"surah": 2, "ayah": 4, "position": 1, "word": "تاب", "start_ms": 600, "end_ms": 900, "confidence": 0.9},
]}


@pytest.fixture
def server(tmp_path):
    list_path = tmp_path / "review.json"
    list_path.write_text(json.dumps(LIST, ensure_ascii=False), encoding="utf-8")
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    (audio_dir / "002.mp3").write_bytes(AUDIO)
    words_dir = tmp_path / "v7"
    words_dir.mkdir()
    (words_dir / "002.json").write_text(json.dumps(WORDS, ensure_ascii=False), encoding="utf-8")
    marks_path = tmp_path / "out" / "253-marks.json"
    srv = make_server(list_path, marks_path, audio_dir, port=0, words_dir=words_dir)
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    srv.base = f"http://127.0.0.1:{srv.server_address[1]}"
    srv.marks_path = marks_path
    yield srv
    srv.shutdown()
    srv.server_close()


def fetch(srv, path, method="GET", body=None, headers=None):
    req = urllib.request.Request(srv.base + path, method=method, data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()


def test_server_binds_to_loopback_only(server):
    assert server.server_address[0] == "127.0.0.1"


def test_page_is_self_contained_rtl_arabic(server):
    status, headers, body = fetch(server, "/")
    html = body.decode("utf-8")
    assert status == 200
    assert headers["Content-Type"].startswith("text/html")
    assert 'lang="ar"' in html and 'dir="rtl"' in html
    assert "https://" not in html and "http://" not in html  # no CDN, no external links
    assert "Amiri Quran" in html


def test_list_endpoint_returns_the_review_list(server):
    status, _, body = fetch(server, "/api/list")
    assert status == 200
    assert json.loads(body) == LIST


def test_marks_are_empty_before_the_first_save(server):
    status, _, body = fetch(server, "/api/marks")
    assert status == 200
    assert json.loads(body) == {"reviewed": []}


def test_post_then_get_marks_round_trip(server):
    marks = {"253": {"002": {"4": 12345}}, "reviewed": ["002:3-4"]}
    status, _, body = fetch(server, "/api/marks", "POST", json.dumps(marks).encode("utf-8"),
                            {"Content-Type": "application/json"})
    assert status == 200 and json.loads(body) == {"ok": True}
    status, _, body = fetch(server, "/api/marks")
    assert json.loads(body) == marks
    assert json.loads(server.marks_path.read_text(encoding="utf-8")) == marks


def test_invalid_post_is_refused_and_the_file_is_untouched(server):
    good = {"253": {"002": {"4": 1}}, "reviewed": []}
    fetch(server, "/api/marks", "POST", json.dumps(good).encode("utf-8"))
    before = server.marks_path.read_bytes()
    for bad in [b"not json", json.dumps({"253": {"002": {"4": -5}}}).encode(), b"[]"]:
        status, _, body = fetch(server, "/api/marks", "POST", bad)
        assert status == 400
        assert "error" in json.loads(body)
    assert server.marks_path.read_bytes() == before


def test_range_request_returns_206_with_the_exact_bytes(server):
    status, headers, body = fetch(server, "/audio/002.mp3", headers={"Range": "bytes=10-19"})
    assert status == 206
    assert headers["Content-Range"] == f"bytes 10-19/{len(AUDIO)}"
    assert headers["Accept-Ranges"] == "bytes"
    assert body == AUDIO[10:20]


def test_open_ended_and_suffix_ranges(server):
    status, _, body = fetch(server, "/audio/002.mp3", headers={"Range": "bytes=1000-"})
    assert status == 206 and body == AUDIO[1000:]
    status, _, body = fetch(server, "/audio/002.mp3", headers={"Range": "bytes=-5"})
    assert status == 206 and body == AUDIO[-5:]


def test_unsatisfiable_range_is_416(server):
    status, headers, _ = fetch(server, "/audio/002.mp3", headers={"Range": "bytes=5000-"})
    assert status == 416
    assert headers["Content-Range"] == f"bytes */{len(AUDIO)}"


def test_audio_without_range_is_the_whole_file(server):
    status, headers, body = fetch(server, "/audio/002.mp3")
    assert status == 200 and body == AUDIO
    assert headers["Content-Length"] == str(len(AUDIO))


def test_missing_audio_and_path_tricks_are_404(server):
    assert fetch(server, "/audio/999.mp3")[0] == 404
    assert fetch(server, "/audio/../review.json")[0] == 404
    assert fetch(server, "/nope")[0] == 404


@pytest.mark.parametrize("header, expected", [
    ("bytes=0-0", (0, 0)),
    ("bytes=0-", (0, 99)),
    ("bytes=-10", (90, 99)),
    ("bytes=50-200", (50, 99)),
    ("bytes=100-", UNSATISFIABLE),
    ("bytes=-0", UNSATISFIABLE),
    ("bytes=20-10", None),
    ("bytes=0-1,5-6", None),
    ("items=0-1", None),
])
def test_parse_byte_range(header, expected):
    assert parse_byte_range(header, 100) == expected


def test_stretch_endpoint_returns_verbatim_tokens_with_aligner_timings(server):
    status, _, body = fetch(server, "/api/stretch/002:3-4")
    assert status == 200
    data = json.loads(body)
    assert (data["id"], data["surah"], data["lo"], data["hi"]) == ("002:3-4", 2, 3, 4)
    a3, a4 = data["ayahs"]
    assert (a3["ayah"], a3["start_ms"], a3["end_ms"]) == (3, 100, 500)
    assert [t["text"] for t in a3["tokens"]] == ["ابتث", "ۖ", "ب"]
    assert [(t["start_ms"], t["end_ms"]) for t in a3["tokens"]] == [(100, 300), (None, None), (400, 500)]
    assert " ".join(t["text"] for t in a4["tokens"]) == AYAH_TEXT[4]


def test_stretch_endpoint_accepts_the_percent_encoded_colon(server):
    status, _, body = fetch(server, "/api/stretch/002%3A3-4")
    assert status == 200 and json.loads(body)["id"] == "002:3-4"


def test_stretch_endpoint_only_serves_stretches_in_the_list(server):
    assert fetch(server, "/api/stretch/002:1-2")[0] == 404  # well-formed, but not in the list
    assert fetch(server, "/api/stretch/../../etc")[0] == 404
    assert fetch(server, "/api/stretch/2:3-4")[0] == 404  # malformed id


def test_stretch_endpoint_reports_missing_aligner_output(tmp_path):
    list_path = tmp_path / "review.json"
    list_path.write_text(json.dumps(LIST), encoding="utf-8")
    (tmp_path / "audio").mkdir()
    srv = make_server(list_path, tmp_path / "m.json", tmp_path / "audio", port=0, words_dir=tmp_path / "none")
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    srv.base = f"http://127.0.0.1:{srv.server_address[1]}"
    try:
        assert fetch(srv, "/api/stretch/002:3-4")[0] == 404
    finally:
        srv.shutdown()
        srv.server_close()


def test_page_has_the_verify_controls_and_the_frame_loop():
    from recitation_align.review_page import PAGE

    for needle in ["requestAnimationFrame", "/api/stretch/", "صحيح", "تم", "ثقة منخفضة", 'e.code === "Enter"']:
        assert needle in PAGE, needle
