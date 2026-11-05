"""repair.py converts frames to seconds and ms with the measured frame length, not 50 frames per second.

The helpers are checked directly; repair_surah itself needs the ASR model and is not run here.
"""

import pytest

from recitation_align.repair import frame_at, ms_of_frame, seconds_of_frame


def test_frame_length_of_twenty_ms_gives_the_old_values():
    assert frame_at(2.5, 0.02) == 125
    assert ms_of_frame(125, 0.02) == 2500
    assert seconds_of_frame(125, 0.02) == pytest.approx(2.5)


def test_long_file_with_measured_frame_length_is_not_the_fixed_fifty_per_second_clock():
    # 002 measured about 20.02 ms per frame: at 1800 s a fixed clock would be about 90 frames off
    sec = 0.02002
    frame = frame_at(1800.0, sec)
    assert frame == round(1800.0 / sec)
    assert frame != round(1800.0 * 50)
    assert abs(ms_of_frame(frame, sec) - 1800000) <= 10  # within a frame


def test_ms_round_trip_stays_within_one_frame_at_any_position():
    sec = 0.0200213
    for seconds in (0.0, 13.7, 600.25, 3599.9):
        ms = ms_of_frame(frame_at(seconds, sec), sec)
        assert abs(ms - seconds * 1000) <= sec * 1000


def test_frame_at_and_back_is_monotonic():
    sec = 0.02001
    frames = [frame_at(t / 10, sec) for t in range(0, 600)]
    assert frames == sorted(frames)
