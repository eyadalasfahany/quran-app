"""Reciter-source abstraction: the MP3Quran adapter, key prefixes, manifest source string, optional fields.

The FixtureSource below is a second adapter, so the pipeline is shown not to depend on MP3Quran.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest.api import Mp3QuranApi
from mp3quran_ingest.errors import IngestError
from mp3quran_ingest.keys import KEY_PREFIX, object_key
from mp3quran_ingest.manifest import empty_manifest, file_entry, load_manifest
from mp3quran_ingest.pipeline import IngestRequest, run_ingest
from mp3quran_ingest.sources import COPY_MODES, Mp3QuranSource, find_moshaf, resolve_mp3quran

from .cdn_fixtures import LAST_MODIFIED, cdn_headers  # noqa: F401 - fixture
from .fake_mp3quran import FakeMp3Quran

NOW = "2026-11-07T12:00:00Z"
PUBLIC = "https://audio.taybah-app.com"
SHA = "ab" * 32
ONE_SURAH = "/audio/test-one/059.mp3"


def measure(_path: Path) -> int:
    return 1500


@dataclass(frozen=True)
class FixtureSource:
    """A second adapter: its own prefix and manifest string, copy by s3 only, records Last-Modified."""

    meta: dict[str, Any]
    source: str = "fixture"
    key_prefix: str = "audio/fixture"
    copy_modes: frozenset[str] = frozenset({"s3"})
    record_last_modified: bool = True

    def source_url(self, surah: int) -> str:
        return f"{self.meta['server']}{surah:03}.mp3"


def request(tmp_path: Path, **overrides: Any) -> IngestRequest:
    values: dict[str, Any] = {
        "moshaf_id": 900,
        "surahs": (59,),
        "work_dir": tmp_path / "work",
        "manifest_path": tmp_path / "manifest.json",
        "public_base": PUBLIC,
        "dry_run": True,
        "source_dir": None,
    }
    values.update(overrides)
    return IngestRequest(**values)


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


# --- the MP3Quran adapter -------------------------------------------------------------------

def test_mp3quran_adapter_fields(api: Mp3QuranApi) -> None:
    source = resolve_mp3quran(api, 900)
    assert isinstance(source, Mp3QuranSource)
    assert source.source == "mp3quran"
    assert source.key_prefix == "audio/mp3quran" == KEY_PREFIX
    assert source.copy_modes == frozenset({"worker", "s3"}) == COPY_MODES
    assert source.record_last_modified is False
    assert source.meta == find_moshaf(api, 900)


def test_mp3quran_source_url_is_server_plus_padded_name(fake_server: FakeMp3Quran) -> None:
    source = Mp3QuranSource(meta={"server": fake_server.audio_folder("test-one")})
    assert source.source_url(1) == f"{fake_server.host}/audio/test-one/001.mp3"
    assert source.source_url(59) == f"{fake_server.host}/audio/test-one/059.mp3"
    assert source.source_url(114) == f"{fake_server.host}/audio/test-one/114.mp3"


def test_mp3quran_source_refuses_non_hafs_through_the_same_lookup(api: Mp3QuranApi) -> None:
    with pytest.raises(IngestError, match="not Hafs"):
        resolve_mp3quran(api, 901)


# --- keys ------------------------------------------------------------------------------------

def test_object_key_default_prefix_is_unchanged() -> None:
    assert object_key(253, 59, SHA) == object_key(253, 59, SHA, prefix="audio/mp3quran")
    assert object_key(253, 59, SHA) == f"audio/mp3quran/253/059-{'ab' * 8}.mp3"


def test_object_key_takes_a_prefix_and_ignores_a_trailing_slash() -> None:
    assert object_key(2, 1, SHA, prefix="audio/way2quran") == f"audio/way2quran/2/001-{'ab' * 8}.mp3"
    assert object_key(2, 1, SHA, prefix="audio/way2quran/") == f"audio/way2quran/2/001-{'ab' * 8}.mp3"


def test_object_key_refuses_an_empty_prefix() -> None:
    with pytest.raises(ValueError):
        object_key(2, 1, SHA, prefix="/")


# --- manifest --------------------------------------------------------------------------------

def test_file_entry_omits_last_modified_when_absent() -> None:
    entry = file_entry(surah=1, key="k", public_base=PUBLIC, size=1, sha256=SHA, duration_ms=1,
                       source_url="u", source_etag=None)
    assert "source_last_modified" not in entry
    assert entry["source_etag"] is None, "a missing ETag is kept as null"
    with_date = file_entry(surah=1, key="k", public_base=PUBLIC, size=1, sha256=SHA, duration_ms=1,
                           source_url="u", source_etag=None, source_last_modified=LAST_MODIFIED)
    assert with_date["source_last_modified"] == LAST_MODIFIED


def test_manifest_source_string_is_a_parameter(tmp_path: Path) -> None:
    assert empty_manifest(PUBLIC)["source"] == "mp3quran"
    assert empty_manifest(PUBLIC, "way2quran")["source"] == "way2quran"
    path = tmp_path / "m.json"
    path.write_text(json.dumps(empty_manifest(PUBLIC, "way2quran")), encoding="utf-8")
    assert load_manifest(path, PUBLIC, "way2quran")["source"] == "way2quran"
    with pytest.raises(IngestError, match="not a mp3quran manifest"):
        load_manifest(path, PUBLIC)


# --- pipeline with the source abstraction ----------------------------------------------------

def test_mp3quran_manifest_does_not_record_last_modified(
    tmp_path: Path, api: Mp3QuranApi, cdn_headers: set[str]
) -> None:
    run_ingest(request(tmp_path), api, None, now=NOW, measure=measure, log=lambda _m: None)
    entry = load(tmp_path / "manifest.json")["moshafs"][0]["files"][0]
    assert "source_last_modified" not in entry
    assert LAST_MODIFIED not in (tmp_path / "manifest.json").read_text(encoding="utf-8")


def test_missing_etag_is_recorded_as_null(tmp_path: Path, api: Mp3QuranApi, cdn_headers: set[str]) -> None:
    cdn_headers.add(ONE_SURAH)
    run_ingest(request(tmp_path), api, None, now=NOW, measure=measure, log=lambda _m: None)
    text = (tmp_path / "manifest.json").read_text(encoding="utf-8")
    entry = load(tmp_path / "manifest.json")["moshafs"][0]["files"][0]
    assert entry["source_etag"] is None
    assert '"source_etag": null' in text


def test_second_source_writes_its_prefix_string_and_last_modified(tmp_path: Path, api: Mp3QuranApi, cdn_headers: set[str]) -> None:
    source = FixtureSource(meta=find_moshaf(api, 900))
    run_ingest(request(tmp_path), api, None, now=NOW, measure=measure, log=lambda _m: None, source=source)
    data = load(tmp_path / "manifest.json")
    assert data["source"] == "fixture"
    entry = data["moshafs"][0]["files"][0]
    assert entry["key"].startswith("audio/fixture/900/059-")
    assert entry["source_last_modified"] == LAST_MODIFIED
    assert entry["source_etag"].startswith('"')
    assert entry["source_url"] == f"{source.meta['server']}059.mp3"


def test_second_source_refuses_a_copy_mode_it_does_not_allow(tmp_path: Path, api: Mp3QuranApi) -> None:
    source = FixtureSource(meta=find_moshaf(api, 900))
    req = request(tmp_path, dry_run=False, via="worker")
    with pytest.raises(IngestError, match="cannot be copied with --via worker"):
        run_ingest(req, api, _Unused(), now=NOW, measure=measure, log=lambda _m: None,
                   worker=object(), source=source)  # type: ignore[arg-type]
    assert not (tmp_path / "manifest.json").exists()


def test_copy_mode_is_not_checked_in_a_dry_run(tmp_path: Path, api: Mp3QuranApi) -> None:
    source = FixtureSource(meta=find_moshaf(api, 900))
    result = run_ingest(request(tmp_path, via="worker"), api, None, now=NOW, measure=measure,
                        log=lambda _m: None, source=source)
    assert result.dry_run_files == 1


def test_manifest_of_another_source_is_refused_by_the_pipeline(tmp_path: Path, api: Mp3QuranApi) -> None:
    (tmp_path / "manifest.json").write_text(
        json.dumps(empty_manifest(PUBLIC, "fixture")), encoding="utf-8"
    )
    with pytest.raises(IngestError, match="not a mp3quran manifest"):
        run_ingest(request(tmp_path), api, None, now=NOW, measure=measure, log=lambda _m: None)


def test_sha_of_the_bytes_is_the_key_hash(tmp_path: Path, api: Mp3QuranApi, fake_server: FakeMp3Quran) -> None:
    run_ingest(request(tmp_path), api, None, now=NOW, measure=measure, log=lambda _m: None)
    entry = load(tmp_path / "manifest.json")["moshafs"][0]["files"][0]
    digest = hashlib.sha256(fake_server.files[ONE_SURAH]).hexdigest()
    assert entry["sha256"] == digest
    assert entry["key"] == object_key(900, 59, digest)


class _Unused:
    """Stands in for the store where a run must refuse before touching it."""

    def object_size(self, key: str) -> int | None:
        raise AssertionError("no R2 call expected")

    def put_file(self, key: str, path: Path) -> None:
        raise AssertionError("no upload expected")
