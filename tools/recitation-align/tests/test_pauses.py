

def test_ffmpeg_output_with_non_utf8_tags_is_read(tmp_path, monkeypatch):
    # an MP3 whose tags are in Windows-1256 makes ffmpeg print bytes that are not UTF-8 (run 42619821481)
    import subprocess as sp

    from recitation_align import pauses

    stderr = b"title : \xc7\xe1\xdd\xc7\xca\xcd\xc9\n[silencedetect @ 0x1] silence_start: 1.5\n" \
             b"[silencedetect @ 0x1] silence_end: 2.5 | silence_duration: 1\n"

    def fake_run(cmd, **kw):
        assert kw.get("errors") == "replace"
        return sp.CompletedProcess(cmd, 0, "", stderr.decode("utf-8", errors=kw["errors"]))

    monkeypatch.setattr(pauses.subprocess, "run", fake_run)
    assert pauses.detect_pauses(tmp_path / "x.mp3") == [(1.5, 2.5)]
