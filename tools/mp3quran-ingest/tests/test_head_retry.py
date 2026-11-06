"""HEAD retries (ADR 0074 decision 10): 5xx, timeouts and connection errors are retried with waits 2, 4, 8 s; 4xx never."""

from __future__ import annotations

import socket

import pytest

from mp3quran_ingest.errors import DownloadError
from mp3quran_ingest.remote import HEAD_BACKOFF_SECONDS, head_file

from .cdn_fixtures import LAST_MODIFIED, cdn_headers, head_faults  # noqa: F401 - fixtures
from .fake_mp3quran import FakeMp3Quran

ONE = "/audio/test-one/001.mp3"


def head_count(fake: FakeMp3Quran, path: str) -> int:
    return sum(1 for method, seen, _ in fake.requests if method == "HEAD" and seen == path)


def test_backoff_is_two_four_eight_seconds() -> None:
    assert HEAD_BACKOFF_SECONDS == (2.0, 4.0, 8.0)


def test_head_timeout_is_retried_then_succeeds(fake_server: FakeMp3Quran, head_faults: dict[str, list[str]]) -> None:
    head_faults[ONE] = ["stall"]
    waits: list[float] = []
    info = head_file(f"{fake_server.host}{ONE}", timeout=0.2, sleep=waits.append)
    assert info.content_length == len(fake_server.files[ONE])
    assert waits == [2.0], "one wait before the second attempt"
    assert head_count(fake_server, ONE) == 2


def test_head_404_is_not_retried(fake_server: FakeMp3Quran) -> None:
    waits: list[float] = []
    missing = f"{fake_server.host}/audio/none/001.mp3"
    with pytest.raises(DownloadError, match="HTTP 404"):
        head_file(missing, sleep=waits.append)
    assert waits == []
    assert head_count(fake_server, "/audio/none/001.mp3") == 1


@pytest.mark.parametrize("status", ["403", "429"])
def test_other_4xx_is_not_retried(fake_server: FakeMp3Quran, head_faults: dict[str, list[str]], status: str) -> None:
    head_faults[ONE] = [status]
    waits: list[float] = []
    with pytest.raises(DownloadError, match=f"HTTP {status}"):
        head_file(f"{fake_server.host}{ONE}", sleep=waits.append)
    assert waits == []
    assert head_count(fake_server, ONE) == 1


def test_5xx_is_retried_then_succeeds(fake_server: FakeMp3Quran, head_faults: dict[str, list[str]]) -> None:
    head_faults[ONE] = ["503", "502"]
    waits: list[float] = []
    info = head_file(f"{fake_server.host}{ONE}", sleep=waits.append)
    assert info.content_length == len(fake_server.files[ONE])
    assert waits == [2.0, 4.0]
    assert head_count(fake_server, ONE) == 3


def test_persistent_5xx_gives_up_after_four_attempts(fake_server: FakeMp3Quran, head_faults: dict[str, list[str]]) -> None:
    head_faults[ONE] = ["503"] * 4
    waits: list[float] = []
    with pytest.raises(DownloadError, match="after 4 attempts"):
        head_file(f"{fake_server.host}{ONE}", sleep=waits.append)
    assert waits == [2.0, 4.0, 8.0]
    assert head_count(fake_server, ONE) == 4


def test_connection_refused_is_retried_then_gives_up(fake_server: FakeMp3Quran) -> None:
    with socket.socket() as probe:  # a port nothing listens on
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    waits: list[float] = []
    with pytest.raises(DownloadError, match="after 4 attempts"):
        head_file(f"http://127.0.0.1:{port}{ONE}", sleep=waits.append)
    assert waits == [2.0, 4.0, 8.0]


def test_head_returns_last_modified_as_sent(fake_server: FakeMp3Quran, cdn_headers: set[str]) -> None:
    info = head_file(f"{fake_server.host}{ONE}")
    assert info.last_modified == LAST_MODIFIED
    assert info.etag and info.etag.startswith('"')


def test_head_without_last_modified_returns_none(fake_server: FakeMp3Quran) -> None:
    info = head_file(f"{fake_server.host}{ONE}")
    assert info.last_modified is None
