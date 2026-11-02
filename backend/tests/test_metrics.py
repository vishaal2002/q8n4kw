import math

from gale.metrics import bias, histogram, mae, quantile, skill


def test_quantile_matches_linear_interpolation():
    assert quantile([1, 2, 3, 4, 5], 0.9) == 4.6
    assert quantile([10], 0.9) == 10


def test_error_sign_is_forecast_minus_outturn():
    assert bias([100, -50]) == 25
    assert mae([100, -50]) == 75


def test_skill_is_the_share_of_baseline_error_removed():
    assert math.isclose(skill(70, 100), 0.3)
    assert skill(100, 0) is None


def test_histogram_counts_the_top_edge_inside_the_last_bin():
    bins = histogram([0, 500, 999], width=500)
    assert [bin_["count"] for bin_ in bins] == [1, 2]
    assert bins[0]["lo"] == 0
    assert math.isclose(bins[1]["hi"], 1000)
