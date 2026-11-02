"""Auction gates the procurement desk can still act on.

EPEX and N2EX publish their day-ahead closes as GMT clock times. January 2026
is entirely inside GMT, so those times are also London times. A forecast is in
the book only when its publish time is strictly earlier than the close: a run
stamped at the bell cannot be typed into an order.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc


@dataclass(frozen=True)
class Gate:
    id: str
    name: str
    close_gmt: str
    note: str


GATES: tuple[Gate, ...] = (
    Gate(
        id="epex",
        name="EPEX day-ahead",
        close_gmt="09:20",
        note="Hourly and 15-minute auction. Closes at 09:20 GMT, before the 09:30 national wind forecast is published.",
    ),
    Gate(
        id="n2ex",
        name="N2EX day-ahead",
        close_gmt="09:50",
        note="Hourly auction. Closes at 09:50 GMT, so the 09:30 national wind forecast is the last morning run in the book.",
    ),
    Gate(
        id="hh",
        name="EPEX half-hour",
        close_gmt="15:30",
        note="Half-hour day-ahead auction. Closes at 15:30 GMT. A wind run is stamped at that same time, so it is not treated as available.",
    ),
)

BY_ID = {gate.id: gate for gate in GATES}


def gate_instant(delivery: date, close_gmt: str) -> datetime:
    """UTC instant of the order-book close on the day before delivery."""

    hour, minute = (int(part) for part in close_gmt.split(":"))
    decision = delivery - timedelta(days=1)
    return datetime(decision.year, decision.month, decision.day, hour, minute, tzinfo=UTC)
