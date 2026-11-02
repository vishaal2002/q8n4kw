"""Join half-hourly outturn to the hourly forecast that was already published."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

UTC = timezone.utc


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def hour_key(moment: datetime) -> str:
    floored = moment.astimezone(UTC).replace(minute=0, second=0, microsecond=0)
    return floored.strftime("%Y-%m-%dT%H:%M:%SZ")


def index_forecasts(rows: list[dict]) -> dict[str, list[tuple[datetime, float]]]:
    seen: set[tuple[str, str]] = set()
    buckets: dict[str, list[tuple[datetime, float]]] = defaultdict(list)
    for row in rows:
        if row.get("generation") is None:
            continue
        identity = (row["publishTime"], row["startTime"])
        if identity in seen:
            continue
        seen.add(identity)
        published = parse_time(row["publishTime"])
        buckets[hour_key(parse_time(row["startTime"]))].append((published, float(row["generation"])))
    for bucket in buckets.values():
        bucket.sort(key=lambda item: item[0])
    return buckets


def latest_before(
    bucket: list[tuple[datetime, float]], gate: datetime
) -> tuple[datetime, float] | None:
    chosen: tuple[datetime, float] | None = None
    for published, generation in bucket:
        if published < gate:
            chosen = (published, generation)
        else:
            break
    return chosen


def actuals_by_day(rows: list[dict]) -> dict[str, dict[str, list[dict]]]:
    """Settlement date → hour start → half-hour outturns."""

    days: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    seen: set[tuple[str, str]] = set()
    for row in rows:
        if row.get("generation") is None:
            continue
        if row.get("fuelType") not in (None, "WIND"):
            continue
        identity = (row["settlementDate"], row["startTime"])
        if identity in seen:
            continue
        seen.add(identity)
        start = parse_time(row["startTime"])
        days[row["settlementDate"]][hour_key(start)].append(
            {
                "start": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "settlementPeriod": int(row["settlementPeriod"]),
                "generationMw": float(row["generation"]),
            }
        )
    for hours in days.values():
        for halves in hours.values():
            halves.sort(key=lambda item: item["start"])
    return days
