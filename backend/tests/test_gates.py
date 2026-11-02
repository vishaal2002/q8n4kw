from datetime import date

from gale.gates import gate_instant


def test_january_gate_is_the_previous_morning_in_gmt():
    assert gate_instant(date(2026, 1, 15), "09:50").isoformat() == "2026-01-14T09:50:00+00:00"
    assert gate_instant(date(2026, 1, 1), "09:20").isoformat() == "2025-12-31T09:20:00+00:00"


def test_half_hour_gate_is_not_shifted_into_london_summer_time():
    # The exchanges state the close in GMT, including outside winter.
    assert gate_instant(date(2026, 7, 2), "15:30").isoformat() == "2026-07-01T15:30:00+00:00"
