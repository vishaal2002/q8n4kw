"""Error statistics for a forecast the desk had already seen.

Sign convention: error = forecast − outturn.
Positive means the desk counted too much wind and, if it bought the residual
to match, was short of other power.
"""

from __future__ import annotations

import math


def quantile(values: list[float], probability: float) -> float:
    """Linear quantile, equivalent to NumPy's default (type 7)."""

    if not values:
        raise ValueError("quantile of an empty sample")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = probability * (len(ordered) - 1)
    lower = math.floor(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def mae(errors: list[float]) -> float:
    return sum(abs(error) for error in errors) / len(errors)


def rmse(errors: list[float]) -> float:
    return math.sqrt(sum(error * error for error in errors) / len(errors))


def bias(errors: list[float]) -> float:
    return sum(errors) / len(errors)


def wape(forecasts: list[float], actuals: list[float]) -> float | None:
    denominator = sum(actuals)
    if denominator == 0:
        return None
    return sum(abs(forecast - actual) for forecast, actual in zip(forecasts, actuals)) / denominator


def pearson(left: list[float], right: list[float]) -> float | None:
    count = len(left)
    if count < 2:
        return None
    mean_left = sum(left) / count
    mean_right = sum(right) / count
    covariance = sum((x - mean_left) * (y - mean_right) for x, y in zip(left, right))
    scale_left = math.sqrt(sum((x - mean_left) ** 2 for x in left))
    scale_right = math.sqrt(sum((y - mean_right) ** 2 for y in right))
    if scale_left == 0 or scale_right == 0:
        return None
    return covariance / (scale_left * scale_right)


def skill(model_mae: float, baseline_mae: float) -> float | None:
    """Fraction of absolute error removed relative to a baseline. 1 is perfect."""

    if baseline_mae == 0:
        return None
    return 1 - model_mae / baseline_mae


def histogram(errors: list[float], width: float = 500) -> list[dict[str, float | int]]:
    if not errors:
        return []
    start = math.floor(min(errors) / width) * width
    end = math.ceil(max(errors) / width) * width
    if end == start:
        end = start + width
    bins: list[dict[str, float | int]] = []
    edge = start
    while edge < end:
        bins.append({"lo": edge, "hi": edge + width, "count": 0})
        edge += width
    for error in errors:
        index = int((error - start) // width)
        if index == len(bins):
            index -= 1
        bins[index]["count"] = int(bins[index]["count"]) + 1
    return bins
