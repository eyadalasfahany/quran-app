"""Pipeline tests: resume, truncation, changed content, manifest, dry-run, credentials, Arabic text."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest.api import Mp3QuranApi
from mp3quran_ingest.config import R2Settings
from mp3quran_ingest.errors import DownloadError, IngestError, TruncatedDownload
from mp3quran_ingest.keys import object_key
from mp3quran_ingest.pipeline import IngestRequest, run_ingest
from mp3quran_ingest.store import R2Store

from .conftest import ARABIC_RECITER, BUCKET, HAFS, SECRET
from .fake_mp3quran import FakeMp3Quran

NOW = "2026-11-04T12:00:00Z"
PUBLIC = "https://audio.taybah-app.com"
ONE_SURAH = "/audio/test-one/059.mp3"


def measure(path: Path) -> int:
    return 541_900


class CountingStore:
    """Wraps the real R2Store and records every write call."""

    def __init__(self, inner: R2Store) -> None:
        self.inner = inner
        self.puts: list[str] = []

    def object_size(self, key: str) -> int | None:
        return self.inner.object_size(key)

    def put_file(self, key: str, path: Path) -> None:
        self.puts.append(key)
        self.inner.put_file(key, path)


def request(tmp_path: Path, **overrides: Any) -> IngestRequest:
    values: dict[str, Any] = {
        "moshaf_id": 900,
        "surahs": None,
        "work_dir": tmp_path / "work",
        "manifest_path": tmp_path / "manifest.json",
        "public_base": PUBLIC,
        "dry_run": False,
        "source_dir": None,
    }
    values.update(overrides)
    return IngestRequest(**values)


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_resume_skips_existing_key(tmp_path: Path, api: Mp3QuranApi, store: R2Store) -> None:
    counting = CountingStore(store)
    first = run_ingest(request(tmp_path, surahs=(59,)), api, counting, now=NOW, measure=measure)
    assert first.uploaded == 1 and counting.puts == [first_key(tmp_path)]

    # A second run with an empty work dir downloads again but must not re-upload the key.
    second = run_ingest(
        request(tmp_path, surahs=(59,), work_dir=tmp_path / "work2", manifest_path=tmp_path / "m2.json"),
        api, counting, now=NOW, measure=measure,
    )
    assert second.uploaded == 0 and second.existing == 1
    assert len(counting.puts) == 1


def first_key(tmp_path: Path) -> str:
    data = load(tmp_path / "manifest.json")
    return data["moshafs"][0]["files"][0]["key"]


def test_truncated_download_rejected_then_resumed(
    tmp_path: Path, api: Mp3QuranApi, fake_server: FakeMp3Quran
) -> None:
    fake_server.truncate.add(ONE_SURAH)
    req = request(tmp_path, surahs=(59,), dry_run=True)
    with pytest.raises(TruncatedDownload):
        run_ingest(req, api, None, now=NOW, measure=measure, log=lambda _m: None)
    part = tmp_path / "work" / "059.mp3.part"
    assert part.is_file() and 0 < part.stat().st_size < len(fake_server.files[ONE_SURAH])
    assert not (tmp_path / "work" / "059.mp3").exists()
    assert not (tmp_path / "manifest.json").exists()

    fake_server.truncate.clear()
    run_ingest(req, api, None, now=NOW, measure=measure, log=lambda _m: None)
    assert (tmp_path / "work" / "059.mp3").read_bytes() == fake_server.files[ONE_SURAH]
    assert any(
        method == "GET" and path == ONE_SURAH and rng is not None and rng.startswith("bytes=")
        for method, path, rng in fake_server.requests
    ), "the retry resumes with a Range request"
    entry = load(tmp_path / "manifest.json")["moshafs"][0]["files"][0]
    assert entry["sha256"] == hashlib.sha256(fake_server.files[ONE_SURAH]).hexdigest()


def test_interrupted_run_keeps_finished_surahs(
    tmp_path: Path, api: Mp3QuranApi, fake_server: FakeMp3Quran
) -> None:
    fake_server.truncate.add(ONE_SURAH)
    with pytest.raises(DownloadError):
        run_ingest(request(tmp_path, surahs=(1, 59), dry_run=True), api, None, now=NOW, measure=measure, log=lambda _m: None)
    files = load(tmp_path / "manifest.json")["moshafs"][0]["files"]
    assert [f["surah"] for f in files] == [1]


def test_changed_content_gets_a_new_key(tmp_path: Path, api: Mp3QuranApi, store: R2Store, fake_server: FakeMp3Quran) -> None:
    run_ingest(request(tmp_path, surahs=(59,)), api, store, now=NOW, measure=measure)
    old_key = first_key(tmp_path)

    local = tmp_path / "local"
    local.mkdir()
    served = fake_server.files[ONE_SURAH]
    (local / "059.mp3").write_bytes(b"X" * len(served))  # same size as the source, different bytes
    run_ingest(
        request(tmp_path, surahs=(59,), source_dir=local, work_dir=tmp_path / "w3"),
        api, store, now=NOW, measure=measure,
    )
    files = load(tmp_path / "manifest.json")["moshafs"][0]["files"]
    assert len(files) == 1, "a replaced surah keeps one entry"
    assert files[0]["key"] != old_key
    assert files[0]["key"] == object_key(900, 59, hashlib.sha256(b"X" * len(served)).hexdigest())
    assert store.object_size(old_key) == len(served), "the old object stays in R2"


def test_manifest_schema_and_determinism(tmp_path: Path, api: Mp3QuranApi) -> None:
    for name in ("a.json", "b.json"):
        run_ingest(
            request(tmp_path, dry_run=True, surahs=(59, 1), manifest_path=tmp_path / name, work_dir=tmp_path / "work"),
            api, None, now=NOW, measure=measure,
        )
    assert (tmp_path / "a.json").read_bytes() == (tmp_path / "b.json").read_bytes()

    data = load(tmp_path / "a.json")
    assert data["schema"] == 1 and data["source"] == "mp3quran"
    assert data["generated_at"] == NOW and data["public_base"] == PUBLIC
    moshaf = data["moshafs"][0]
    assert set(moshaf) == {"moshaf_id", "reciter_id", "name_ar", "name_en", "riwayah", "moshaf_name", "server", "surah_list", "files"}
    assert moshaf["moshaf_id"] == 900 and moshaf["surah_list"] == [1, 3, 59]
    assert [f["surah"] for f in moshaf["files"]] == [1, 59], "files sorted by surah"
    for entry in moshaf["files"]:
        assert set(entry) == {"surah", "key", "url", "bytes", "sha256", "duration_ms", "source_url", "source_etag"}
        assert entry["key"].startswith("audio/mp3quran/900/") and entry["key"].endswith(".mp3")
        assert entry["url"] == f"{PUBLIC}/{entry['key']}"
        assert entry["duration_ms"] == 541_900
    text = (tmp_path / "a.json").read_text(encoding="utf-8")
    assert text.endswith("\n") and "\r" not in text


def test_dry_run_makes_no_s3_calls(tmp_path: Path, api: Mp3QuranApi, monkeypatch: pytest.MonkeyPatch) -> None:
    import boto3

    def forbidden(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("dry-run must not create an S3 client")

    monkeypatch.setattr(boto3, "client", forbidden)
    result = run_ingest(
        request(tmp_path, dry_run=True, surahs=(59,)), api, None, now=NOW, measure=measure, log=lambda _m: None
    )
    assert result.dry_run_files == 1 and result.uploaded == 0


def test_real_store_is_never_built_in_dry_run(tmp_path: Path, api: Mp3QuranApi) -> None:
    class ExplodingStore:
        def object_size(self, key: str) -> int | None:
            raise AssertionError("no S3 call in dry-run")

        def put_file(self, key: str, path: Path) -> None:
            raise AssertionError("no upload in dry-run")

    run_ingest(request(tmp_path, dry_run=True, surahs=(59,)), api, ExplodingStore(), now=NOW, measure=measure)


def test_no_credential_value_in_output_or_manifest(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, settings: R2Settings, capsys: pytest.CaptureFixture[str], caplog: pytest.LogCaptureFixture
) -> None:
    run_ingest(request(tmp_path, surahs=(59,)), api, store, now=NOW, measure=measure)
    captured = capsys.readouterr()
    manifest_text = (tmp_path / "manifest.json").read_text(encoding="utf-8")
    haystacks = [captured.out, captured.err, caplog.text, manifest_text, repr(settings)]
    for needle in (SECRET, settings.access_key_id, settings.account_id):
        assert all(needle not in text for text in haystacks)


def test_uploaded_object_has_the_immutable_headers(tmp_path: Path, api: Mp3QuranApi, store: R2Store, s3_client: Any) -> None:
    run_ingest(request(tmp_path, surahs=(59,)), api, store, now=NOW, measure=measure)
    key = first_key(tmp_path)
    head = s3_client.head_object(Bucket=BUCKET, Key=key)
    assert head["CacheControl"] == "public, max-age=31536000, immutable"
    assert head["ContentType"] == "audio/mpeg"
    assert head["ContentLength"] == (tmp_path / "work" / "059.mp3").stat().st_size


def test_botocore_transport_error_hides_the_account_id(
    api: Mp3QuranApi, tmp_path: Path, settings: R2Settings, capsys: pytest.CaptureFixture[str]
) -> None:
    from botocore.exceptions import EndpointConnectionError

    class BrokenClient:
        def head_object(self, **_kwargs: Any) -> None:
            raise EndpointConnectionError(endpoint_url="https://acct123.r2.cloudflarestorage.com/quran/x")

    broken = R2Store(settings, client=BrokenClient())
    with pytest.raises(IngestError) as info:
        broken.object_size("audio/mp3quran/900/059-aaaa.mp3")
    assert "acct123" not in str(info.value)
    assert "EndpointConnectionError" in str(info.value)
    assert info.value.__cause__ is None and info.value.__suppress_context__
    captured = capsys.readouterr()
    assert "acct123" not in captured.out + captured.err


def test_arabic_names_are_stored_as_utf8(tmp_path: Path, api: Mp3QuranApi) -> None:
    run_ingest(request(tmp_path, dry_run=True, surahs=(59,)), api, None, now=NOW, measure=measure)
    raw = (tmp_path / "manifest.json").read_bytes()
    assert ARABIC_RECITER.encode("utf-8") in raw
    assert HAFS.encode("utf-8") in raw
    assert b"\\u" not in raw, "names are not escaped"
    moshaf = load(tmp_path / "manifest.json")["moshafs"][0]
    assert moshaf["name_ar"] == ARABIC_RECITER and moshaf["riwayah"] == HAFS


def test_source_dir_bytes_must_match_content_length(tmp_path: Path, api: Mp3QuranApi) -> None:
    local = tmp_path / "local"
    local.mkdir()
    (local / "059.mp3").write_bytes(b"short")
    with pytest.raises(IngestError, match="Content-Length"):
        run_ingest(request(tmp_path, dry_run=True, surahs=(59,), source_dir=local), api, None, now=NOW, measure=measure)


def test_only_hafs_and_listed_surahs(tmp_path: Path, api: Mp3QuranApi) -> None:
    with pytest.raises(IngestError, match="not Hafs"):
        run_ingest(request(tmp_path, moshaf_id=901, dry_run=True), api, None, now=NOW, measure=measure)
    with pytest.raises(IngestError, match="not in moshaf"):
        run_ingest(request(tmp_path, dry_run=True, surahs=(2,)), api, None, now=NOW, measure=measure)
    with pytest.raises(IngestError, match="not in the MP3Quran"):
        run_ingest(request(tmp_path, moshaf_id=12345, dry_run=True), api, None, now=NOW, measure=measure)


def test_upload_read_back_mismatch_is_refused(tmp_path: Path, api: Mp3QuranApi) -> None:
    class LyingStore:
        """Accepts the upload but reports a different size on read-back."""

        def __init__(self) -> None:
            self.stored = False

        def object_size(self, key: str) -> int | None:
            return 1 if self.stored else None

        def put_file(self, key: str, path: Path) -> None:
            self.stored = True

    with pytest.raises(IngestError, match="read-back"):
        run_ingest(request(tmp_path, surahs=(59,)), api, LyingStore(), now=NOW, measure=measure)


def test_real_upload_requires_a_store(tmp_path: Path, api: Mp3QuranApi) -> None:
    with pytest.raises(IngestError, match="object store is required"):
        run_ingest(request(tmp_path, surahs=(59,)), api, None, now=NOW, measure=measure)
