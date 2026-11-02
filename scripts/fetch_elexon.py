"""Download the January 2026 wind actuals and forecasts this desk is allowed to use.

Actuals: Elexon FUELHH, fuelType WIND.
Forecasts: Elexon WINDFOR.

December 2025 is included only so the 1 January gates have a forecast already
published, and so 1 January can be compared with the previous day's outturn.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = "https://data.elexon.co.uk/bmrs/api/v1"
OUT = Path(__file__).resolve().parents[1] / "backend" / "data"
UTC = timezone.utc


def fetch(url: str) -> list[dict]:
    for attempt in range(6):
        request = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "gale-pilot/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 5:
                time.sleep(2**attempt)
                continue
            raise
        if isinstance(payload, dict):
            payload = payload.get("data", [])
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected payload from {url}")
        return payload
    raise RuntimeError(url)


def stamp(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_actuals() -> list[dict]:
    rows: list[dict] = []
    day = datetime(2025, 12, 31, tzinfo=UTC)
    last = datetime(2026, 1, 31, tzinfo=UTC)
    while day <= last:
        end = min(day + timedelta(days=6), last)
        query = urllib.parse.urlencode(
            {
                "settlementDateFrom": day.strftime("%Y-%m-%d"),
                "settlementDateTo": end.strftime("%Y-%m-%d"),
                "fuelType": "WIND",
            }
        )
        batch = fetch(f"{BASE}/datasets/FUELHH/stream?{query}")
        print(f"FUELHH {day.date()}..{end.date()} {len(batch)}")
        for row in batch:
            if row.get("fuelType") != "WIND" or row.get("generation") is None:
                continue
            rows.append(
                {
                    "publishTime": row["publishTime"],
                    "startTime": row["startTime"],
                    "settlementDate": row["settlementDate"],
                    "settlementPeriod": row["settlementPeriod"],
                    "generation": row["generation"],
                }
            )
        day = end + timedelta(days=1)
        time.sleep(0.25)
    return rows


def fetch_forecasts() -> list[dict]:
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    cursor = datetime(2025, 12, 30, tzinfo=UTC)
    end = datetime(2026, 2, 1, 12, tzinfo=UTC)
    while cursor < end:
        nxt = min(cursor + timedelta(days=3), end)
        query = urllib.parse.urlencode(
            {
                "publishDateTimeFrom": stamp(cursor - timedelta(hours=1)),
                "publishDateTimeTo": stamp(nxt),
            }
        )
        batch = fetch(f"{BASE}/datasets/WINDFOR/stream?{query}")
        added = 0
        for row in batch:
            if row.get("generation") is None:
                continue
            key = (row["publishTime"], row["startTime"])
            if key in seen:
                continue
            seen.add(key)
            added += 1
            rows.append(
                {
                    "publishTime": row["publishTime"],
                    "startTime": row["startTime"],
                    "generation": row["generation"],
                }
            )
        print(f"WINDFOR {stamp(cursor)} -> {stamp(nxt)} {added}")
        cursor = nxt
        time.sleep(0.25)
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    actuals = fetch_actuals()
    forecasts = fetch_forecasts()
    (OUT / "fuelhh.json").write_text(json.dumps(actuals, separators=(",", ":")))
    (OUT / "windfor.json").write_text(json.dumps(forecasts, separators=(",", ":")))
    print(f"wrote {len(actuals)} actuals and {len(forecasts)} forecasts")


if __name__ == "__main__":
    main()
