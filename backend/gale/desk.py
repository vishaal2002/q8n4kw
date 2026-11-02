"""Assemble one month of decision-time forecasts and their outturn."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from gale.gates import BY_ID, GATES, gate_instant
from gale.metrics import bias, histogram, mae, pearson, quantile, rmse, skill, wape
from gale.series import actuals_by_day, hour_key, index_forecasts, latest_before, parse_time

MONTH = (2026, 1)
MIN_HISTORY = 7
COVER_QUANTILE = 0.9


def _round(value: float | None, places: int = 1) -> float | None:
    if value is None:
        return None
    return round(float(value), places)


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def january_days() -> list[date]:
    return [date(2026, 1, day) for day in range(1, 32)]


def _hour_number(start: str) -> int:
    return parse_time(start).hour


def build_bundle(actual_rows: list[dict], forecast_rows: list[dict]) -> dict[str, dict]:
    actuals = actuals_by_day(actual_rows)
    forecasts = index_forecasts(forecast_rows)
    clocks = sorted(
        {published.strftime("%H:%M") for bucket in forecasts.values() for published, _ in bucket}
    )
    desks = {
        gate.id: _build_gate(gate.id, actuals, forecasts, clocks) for gate in GATES
    }
    _attach_revisions(desks)
    return desks


def _build_gate(
    gate_id: str,
    actuals: dict[str, dict[str, list[dict]]],
    forecasts: dict[str, list[tuple[datetime, float]]],
    clocks: list[str],
) -> dict:
    gate = BY_ID[gate_id]
    history: dict[int, list[float]] = defaultdict(list)
    days = []
    paired_errors: list[float] = []
    paired_forecasts: list[float] = []
    paired_actuals: list[float] = []
    persistence_abs: list[float] = []
    model_abs_on_persistence: list[float] = []
    within_hour: list[float] = []
    cover_hits: list[bool] = []
    cover_haircuts: list[float] = []
    publish_clocks: list[str] = []

    for delivery in january_days():
        close = gate_instant(delivery, gate.close_gmt)
        decision = delivery - timedelta(days=1)
        yesterday = (delivery - timedelta(days=1)).isoformat()
        hours_payload = []
        day_clocks: list[str] = []

        for start in sorted(actuals.get(delivery.isoformat(), {})):
            halves = actuals[delivery.isoformat()][start]
            actual = _mean([half["generationMw"] for half in halves]) if len(halves) == 2 else None
            if len(halves) == 2:
                within_hour.append(abs(halves[0]["generationMw"] - halves[1]["generationMw"]))
            chosen = latest_before(forecasts.get(start, []), close)
            forecast = chosen[1] if chosen else None
            published = chosen[0] if chosen else None
            error = forecast - actual if forecast is not None and actual is not None else None
            hour = _hour_number(start)
            haircut = None
            counted = None
            if len(history[hour]) >= MIN_HISTORY and forecast is not None:
                haircut = max(quantile(history[hour], COVER_QUANTILE), 0.0)
                counted = forecast - haircut
                if error is not None:
                    cover_hits.append(error <= haircut)
                    cover_haircuts.append(haircut)
            if error is not None:
                history[hour].append(error)
                paired_errors.append(error)
                paired_forecasts.append(forecast)
                paired_actuals.append(actual)
                prior = actuals.get(yesterday, {}).get(hour_key(parse_time(start) - timedelta(days=1)))
                if prior and len(prior) == 2:
                    prior_mw = _mean([half["generationMw"] for half in prior])
                    persistence_abs.append(abs(prior_mw - actual))
                    model_abs_on_persistence.append(abs(error))
            if published is not None:
                clock = published.strftime("%H:%M")
                day_clocks.append(clock)
                publish_clocks.append(clock)
            hours_payload.append(
                {
                    "start": start,
                    "hour": hour,
                    "forecastMw": _round(forecast, 1),
                    "publishTime": published.strftime("%Y-%m-%dT%H:%M:%SZ") if published else None,
                    "actualMw": _round(actual, 1),
                    "errorMw": _round(error, 1),
                    "haircutMw": _round(haircut, 1),
                    "countedMw": _round(counted, 1),
                    "halves": [
                        {
                            "start": half["start"],
                            "settlementPeriod": half["settlementPeriod"],
                            "generationMw": half["generationMw"],
                        }
                        for half in halves
                    ],
                }
            )

        day_errors = [hour["errorMw"] for hour in hours_payload if hour["errorMw"] is not None]
        day_forecasts = [hour["forecastMw"] for hour in hours_payload if hour["forecastMw"] is not None]
        day_actuals = [hour["actualMw"] for hour in hours_payload if hour["actualMw"] is not None]
        modal_clock, modal_share = _mode(day_clocks)
        days.append(
            {
                "date": delivery.isoformat(),
                "decisionDate": decision.isoformat(),
                "maeMw": _round(mae(day_errors) if day_errors else None),
                "biasMw": _round(bias(day_errors) if day_errors else None),
                "meanForecastMw": _round(_mean(day_forecasts)),
                "meanActualMw": _round(_mean(day_actuals)),
                "energyForecastGwh": _round((sum(day_forecasts) / 1000) if day_forecasts else None, 3),
                "energyActualGwh": _round((sum(day_actuals) / 1000) if day_actuals else None, 3),
                "pairedHours": len(day_errors),
                "publishGmt": modal_clock,
                "publishShare": _round(modal_share, 3),
                "hours": hours_payload,
            }
        )

    typical, typical_share = _mode(publish_clocks)
    by_hour = []
    for hour in range(24):
        errors = history[hour]
        by_hour.append(
            {
                "hour": hour,
                "hours": len(errors),
                "maeMw": _round(mae(errors) if errors else None),
                "biasMw": _round(bias(errors) if errors else None),
                "p90Mw": _round(quantile(errors, COVER_QUANTILE) if errors else None),
            }
        )

    persistence_mae = _mean(persistence_abs)
    model_mae_same = _mean(model_abs_on_persistence)
    return {
        "gate": {
            "id": gate.id,
            "name": gate.name,
            "closeGmt": gate.close_gmt,
            "note": gate.note,
        },
        "month": "2026-01",
        "source": {
            "publishClocksGmt": clocks,
            "typicalPublishGmt": typical,
            "typicalPublishShare": _round(typical_share, 3),
            "exceptions": [
                {"date": day["date"], "publishGmt": day["publishGmt"]}
                for day in days
                if day["publishGmt"] != typical
            ],
        },
        "score": {
            "hours": len(paired_errors),
            "expectedHours": 31 * 24,
            "maeMw": _round(mae(paired_errors) if paired_errors else None),
            "rmseMw": _round(rmse(paired_errors) if paired_errors else None),
            "biasMw": _round(bias(paired_errors) if paired_errors else None),
            "wape": _round(wape(paired_forecasts, paired_actuals) if paired_errors else None, 4),
            "correlation": _round(pearson(paired_forecasts, paired_actuals) if paired_errors else None, 3),
            "persistenceMaeMw": _round(persistence_mae),
            "skill": _round(skill(model_mae_same, persistence_mae) if model_mae_same is not None and persistence_mae else None, 3),
            "p10Mw": _round(quantile(paired_errors, 0.1) if paired_errors else None),
            "p90Mw": _round(quantile(paired_errors, COVER_QUANTILE) if paired_errors else None),
            "energyErrorGwh": _round(sum(paired_errors) / 1000 if paired_errors else None, 2),
            "meanForecastMw": _round(_mean(paired_forecasts)),
            "meanActualMw": _round(_mean(paired_actuals)),
            "withinHourSpreadMw": _round(_mean(within_hour)),
        },
        "cover": {
            "minHistory": MIN_HISTORY,
            "quantile": COVER_QUANTILE,
            "hoursScored": len(cover_hits),
            "coverage": _round((sum(cover_hits) / len(cover_hits)) if cover_hits else None, 3),
            "meanHaircutMw": _round(_mean(cover_haircuts)),
            "extraEnergyGwh": _round(sum(cover_haircuts) / 1000 if cover_haircuts else None, 2),
        },
        "revision": None,
        "byHour": by_hour,
        "histogram": histogram(paired_errors),
        "days": days,
    }


def _mode(values: list[str]) -> tuple[str | None, float | None]:
    if not values:
        return None, None
    clock, count = Counter(values).most_common(1)[0]
    return clock, count / len(values)


def _attach_revisions(desks: dict[str, dict]) -> None:
    order = [gate.id for gate in GATES]
    for earlier, later in zip(order, order[1:]):
        shifts = []
        for left, right in zip(desks[earlier]["days"], desks[later]["days"]):
            if left["meanForecastMw"] is None or right["meanForecastMw"] is None:
                continue
            if left["pairedHours"] < 20 or right["pairedHours"] < 20:
                continue
            shifts.append((right["date"], right["meanForecastMw"] - left["meanForecastMw"]))
        if not shifts:
            continue
        magnitudes = [shift for _, shift in shifts]
        rising = max(shifts, key=lambda item: item[1])
        falling = min(shifts, key=lambda item: item[1])
        desks[later]["revision"] = {
            "fromGate": earlier,
            "fromName": BY_ID[earlier].name,
            "meanRevisionMw": _round(sum(magnitudes) / len(magnitudes)),
            "meanAbsRevisionMw": _round(sum(abs(value) for value in magnitudes) / len(magnitudes)),
            "largestUp": {"date": rising[0], "revisionMw": _round(rising[1])},
            "largestDown": {"date": falling[0], "revisionMw": _round(falling[1])},
        }
