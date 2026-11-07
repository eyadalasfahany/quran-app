"""Way2Quran lister (plan step 6): page extraction, HEAD checks, refusals and the idempotent --write. No network.

The extractor tests use a page shaped like the real one (repeated Hafs links, Warsh links and noise). The
lister tests run against the fake host in tests/fake_way2quran.py.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest import way2quran as w2q
from mp3quran_ingest.errors import IngestError
from mp3quran_ingest.remote import RemoteFile, head_file
from mp3quran_ingest.way2quran import (
    extract_listing,
    list_reciter,
    load_reciters,
    write_reciter,
)

from .fake_way2quran import way2quran_host  # noqa: F401 - fixture
from .fake_way2quran import FakeWay2Quran, file_path, page_path, placeholder_audio
from .test_way2quran_data import FIXTURE_ENTRY, entry, parse_reciter

EBADI = "hossam-el-din-ebadi"
MEDIA = "https://media.way2quran.com"
EBADI_HAFS_SURAHS = [
    1, 12, 14, 15, 17, 18, 19, 31, 32, 36, 38, 44, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
    62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 93, 99,
]
UNPADDED = {79, 80, 82, 83, 84, 87}
WARSH_SURAHS = list(range(1, 29))


def ebadi_name(surah: int) -> str:
    return f"{surah}.mp3" if surah in UNPADDED else f"{surah:03}.mp3"


def page_html(base: str, slug: str, hafs: list[str], warsh: list[str] = []) -> str:
    """A page shaped like the real one: each link appears twice, Warsh links sit beside them, noise is mixed in."""
    links = [f'<a href="{base}/{slug}/hafs-an-asim/{n}">x</a>' for n in hafs]
    links += [f'<a href="{base}/{slug}/warsh-an-nafi/{n}">x</a>' for n in warsh]
    body = "".join(links + links)
    noise = (
        f'<script>var a="{base}/{slug}/hafs-an-";var b="{base}/zip-files/{slug}/all.zip";'
        f'var c="{base}/imgs/{slug}.jpg";var d="{base}/other-reciter/hafs-an-asim/001.mp3";</script>'
    )
    return f"<html><body>{body}{noise}</body></html>"


# --- the extractor -----------------------------------------------------------------------------

def test_real_shape_gives_54_hafs_and_ignores_28_warsh() -> None:
    hafs = [ebadi_name(s) for s in EBADI_HAFS_SURAHS]
    warsh = [f"{s:03}.mp3" for s in WARSH_SURAHS]
    listing = extract_listing(page_html(MEDIA, EBADI, hafs, warsh), EBADI)
    assert len(listing.files) == 54
    assert listing.ignored == 28
    assert sorted(listing.files) == EBADI_HAFS_SURAHS
    assert listing.files[79] == "79.mp3"
    assert listing.files[1] == "001.mp3"


def test_noise_and_other_reciters_are_not_counted() -> None:
    listing = extract_listing(page_html(MEDIA, EBADI, ["001.mp3"]), EBADI)
    assert listing.files == {1: "001.mp3"}
    assert listing.ignored == 0, "the other-reciter link and the truncated prefix are not riwayat files"


def test_an_exact_repeat_is_deduplicated_not_refused() -> None:
    listing = extract_listing(page_html(MEDIA, EBADI, ["012.mp3", "012.mp3", "012.mp3"]), EBADI)
    assert listing.files == {12: "012.mp3"}


def test_a_surah_listed_under_two_names_is_refused() -> None:
    with pytest.raises(IngestError, match="listed twice"):
        extract_listing(page_html(MEDIA, EBADI, ["079.mp3", "79.mp3"]), EBADI)


@pytest.mark.parametrize("name", ["abc.mp3", "0001.mp3", "000.mp3", "115.mp3"])
def test_a_hafs_name_that_is_not_a_surah_file_is_refused(name: str) -> None:
    with pytest.raises(IngestError):
        extract_listing(page_html(MEDIA, EBADI, [name]), EBADI)


def test_an_empty_page_gives_no_files() -> None:
    assert extract_listing("<html></html>", EBADI).files == {}


def test_a_media_base_other_than_production_is_honoured() -> None:
    html = page_html("http://127.0.0.1:9", EBADI, ["001.mp3"], ["001.mp3"])
    listing = extract_listing(html, EBADI, "http://127.0.0.1:9")
    assert listing.files == {1: "001.mp3"}
    assert listing.ignored == 1


# --- the lister against the fake host -----------------------------------------------------------

FIXTURE_NAMES = {1: "001.mp3", 12: "012.mp3", 79: "79.mp3"}


def stage_fixture(fake: FakeWay2Quran, slug: str = "fixture-reciter", *, extra_warsh: bool = True) -> None:
    hafs = [FIXTURE_NAMES[s] for s in sorted(FIXTURE_NAMES)]
    warsh = ["001.mp3"] if extra_warsh else []
    fake.pages[page_path(slug)] = page_html(fake.host, slug, hafs, warsh)
    for name in hafs:
        fake.files[file_path(slug, name)] = placeholder_audio(name, 1000 + len(name))


def quick_head(fake: FakeWay2Quran, sleeps: list[float] | None = None) -> Any:
    waits = sleeps if sleeps is not None else []

    def head(url: str) -> RemoteFile:
        return head_file(url, timeout=0.2, sleep=waits.append)

    return head


def run_list(fake: FakeWay2Quran, head: Any = None, **overrides: Any) -> Any:
    values: dict[str, Any] = {
        "slug": "fixture-reciter",
        "reciter_id": 1,
        "name_ar": "قارئ تجريبي للاختبار",
        "name_en": "Fixture Reciter",
        "site_base": fake.host,
        "media_base": fake.host,
        "head": head or quick_head(fake),
    }
    values.update(overrides)
    return list_reciter(**values)


def test_lister_builds_a_validated_entry_with_totals(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    result = run_list(way2quran_host)
    assert result.reciter.files == FIXTURE_NAMES
    assert result.reciter.to_json()["page_url"] == "https://way2quran.com/ar/reciters/fixture-reciter"
    assert result.ignored == 1
    expected = sum(len(way2quran_host.files[file_path("fixture-reciter", n)]) for n in FIXTURE_NAMES.values())
    assert result.total_bytes == expected


def test_a_head_that_fails_after_retries_refuses_the_entry(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    way2quran_host.faults[file_path("fixture-reciter", "012.mp3")] = ["503", "503", "503", "503"]
    waits: list[float] = []
    with pytest.raises(IngestError, match="entry refused: surah 12"):
        run_list(way2quran_host, head=quick_head(way2quran_host, waits))
    assert waits == [2.0, 4.0, 8.0]
    assert way2quran_host.head_count(file_path("fixture-reciter", "012.mp3")) == 4


def test_a_head_timeout_is_retried_then_the_entry_is_listed(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    way2quran_host.faults[file_path("fixture-reciter", "001.mp3")] = ["stall"]
    waits: list[float] = []
    result = run_list(way2quran_host, head=quick_head(way2quran_host, waits))
    assert result.reciter.files == FIXTURE_NAMES
    assert waits == [2.0]


def test_a_404_is_refused_without_a_retry(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    way2quran_host.faults[file_path("fixture-reciter", "79.mp3")] = ["404"]
    waits: list[float] = []
    with pytest.raises(IngestError, match="surah 79"):
        run_list(way2quran_host, head=quick_head(way2quran_host, waits))
    assert waits == []


def test_a_redirect_is_refused(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    way2quran_host.faults[file_path("fixture-reciter", "001.mp3")] = ["redirect"]
    with pytest.raises(IngestError, match="redirects to another address"):
        run_list(way2quran_host)


def test_a_file_that_is_not_audio_mpeg_is_refused(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    way2quran_host.faults[file_path("fixture-reciter", "012.mp3")] = ["html"]
    with pytest.raises(IngestError, match="expected audio/mpeg"):
        run_list(way2quran_host)


def test_a_reciter_page_with_no_hafs_files_is_refused(way2quran_host: FakeWay2Quran) -> None:
    way2quran_host.pages[page_path("fixture-reciter")] = page_html(way2quran_host.host, "fixture-reciter", [], ["001.mp3"])
    with pytest.raises(IngestError, match="no Hafs files"):
        run_list(way2quran_host)


def test_a_bad_slug_is_refused_before_any_request(way2quran_host: FakeWay2Quran) -> None:
    with pytest.raises(IngestError, match="slug"):
        run_list(way2quran_host, slug="Not A Slug")
    assert way2quran_host.requests == []


def test_the_entry_is_validated_before_any_head(way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    with pytest.raises(IngestError, match="reciter_id"):
        run_list(way2quran_host, reciter_id=0)
    assert way2quran_host.head_count(file_path("fixture-reciter", "001.mp3")) == 0


# --- --write ---------------------------------------------------------------------------------

def test_write_adds_the_entry_and_a_second_write_changes_nothing(tmp_path: Path, way2quran_host: FakeWay2Quran) -> None:
    stage_fixture(way2quran_host)
    data = tmp_path / "data.json"
    reciter = run_list(way2quran_host).reciter
    write_reciter(data, reciter)
    first = data.read_bytes()
    write_reciter(data, reciter)
    assert data.read_bytes() == first
    assert load_reciters(data) == [reciter]


def test_write_keeps_other_reciters_and_sorts_by_id(tmp_path: Path) -> None:
    data = tmp_path / "data.json"
    data.write_text(json.dumps({"schema": 1, "reciters": [entry(reciter_id=5, slug="five")]}), encoding="utf-8")
    write_reciter(data, parse_reciter(entry(reciter_id=2, slug="two")))
    ids = [r.reciter_id for r in load_reciters(data)]
    assert ids == [2, 5]


def test_write_replaces_the_same_reciter_id(tmp_path: Path) -> None:
    data = tmp_path / "data.json"
    write_reciter(data, parse_reciter(entry()))
    changed = parse_reciter(entry(name_en="Renamed"))
    write_reciter(data, changed)
    assert [r.name_en for r in load_reciters(data)] == ["Renamed"]


def test_write_refuses_a_slug_already_used_by_another_id(tmp_path: Path) -> None:
    data = tmp_path / "data.json"
    write_reciter(data, parse_reciter(entry()))
    with pytest.raises(IngestError, match="slug appears twice"):
        write_reciter(data, parse_reciter(entry(reciter_id=9)))


def test_the_written_file_keeps_surahs_in_numeric_order(tmp_path: Path) -> None:
    data = tmp_path / "data.json"
    write_reciter(data, parse_reciter(entry()))
    surah_keys = list(json.loads(data.read_text(encoding="utf-8"))["reciters"][0]["files"])
    assert surah_keys == ["1", "12", "79"]


def test_module_constants_are_the_production_hosts() -> None:
    assert w2q.SITE_BASE == "https://way2quran.com"
    assert w2q.MEDIA_BASE == MEDIA
    assert FIXTURE_ENTRY["page_url"] == "https://way2quran.com/ar/reciters/fixture-reciter"
