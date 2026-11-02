from gale.desk import build_bundle


def _actual(day: str, hour: int, first: float, second: float, period: int) -> list[dict]:
    stem = f"{day}T{hour:02d}"
    return [
        {
            "startTime": f"{stem}:00:00Z",
            "settlementDate": day,
            "settlementPeriod": period,
            "generation": first,
            "fuelType": "WIND",
        },
        {
            "startTime": f"{stem}:30:00Z",
            "settlementDate": day,
            "settlementPeriod": period + 1,
            "generation": second,
            "fuelType": "WIND",
        },
    ]


def _forecast(published: str, day: str, hour: int, generation: float) -> dict:
    return {
        "publishTime": published,
        "startTime": f"{day}T{hour:02d}:00:00Z",
        "generation": generation,
    }


def test_each_gate_holds_only_the_run_published_before_it_closed():
    actuals = []
    forecasts = []
    # Thirty-one identical delivery days so the join is about the gate, not the calendar.
    for day in range(1, 32):
        delivery = f"2026-01-{day:02d}"
        decision = f"2026-01-{day - 1:02d}" if day > 1 else "2025-12-31"
        actuals.extend(_actual(delivery, 0, 800, 1200, 1))
        forecasts.append(_forecast(f"{decision}T07:30:00Z", delivery, 0, 1000))
        forecasts.append(_forecast(f"{decision}T09:30:00Z", delivery, 0, 5000))
        forecasts.append(_forecast(f"{decision}T11:30:00Z", delivery, 0, 2000))
        forecasts.append(_forecast(f"{decision}T15:30:00Z", delivery, 0, 9000))

    desks = build_bundle(actuals, forecasts)
    assert desks["epex"]["days"][14]["hours"][0]["forecastMw"] == 1000
    assert desks["n2ex"]["days"][14]["hours"][0]["forecastMw"] == 5000
    assert desks["hh"]["days"][14]["hours"][0]["forecastMw"] == 2000
    assert desks["epex"]["days"][14]["hours"][0]["actualMw"] == 1000
    assert desks["n2ex"]["days"][14]["hours"][0]["errorMw"] == 4000


def test_haircut_uses_only_earlier_deliveries_of_the_same_hour():
    actuals = []
    forecasts = []
    for day in range(1, 32):
        delivery = f"2026-01-{day:02d}"
        decision = f"2026-01-{day - 1:02d}" if day > 1 else "2025-12-31"
        # Outturn 0, forecast 100, so every settled error is +100 MW.
        actuals.extend(_actual(delivery, 0, 0, 0, 1))
        forecasts.append(_forecast(f"{decision}T07:30:00Z", delivery, 0, 100))

    hour = build_bundle(actuals, forecasts)["epex"]["days"]
    assert hour[6]["hours"][0]["haircutMw"] is None
    assert hour[7]["hours"][0]["haircutMw"] == 100
    assert hour[7]["hours"][0]["countedMw"] == 0


def test_a_publish_at_the_bell_is_excluded_and_yesterday_is_the_baseline():
    actuals = _actual("2025-12-31", 0, 100, 100, 1) + _actual("2026-01-01", 0, 180, 180, 1)
    forecasts = [
        _forecast("2025-12-31T09:20:00Z", "2026-01-01", 0, 9999),
        _forecast("2025-12-31T07:30:00Z", "2026-01-01", 0, 140),
    ]
    score = build_bundle(actuals, forecasts)["epex"]["score"]
    assert score["hours"] == 1
    assert score["maeMw"] == 40
    assert score["persistenceMaeMw"] == 80
    assert score["skill"] == 0.5
