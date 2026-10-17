import math
from app.services.ingestion import clean_value

def test_clean_value_handles_none_and_nan():
    assert clean_value(None, min_val=0.0, fallback=15.0) == 15.0
    assert clean_value(float("nan"), min_val=0.0, fallback=25.0) == 25.0

def test_clean_value_clamps_negative_outliers():
    assert clean_value(-12.5, min_val=0.0, fallback=0.0) == 0.0

def test_clean_value_clamps_extreme_upper_outliers():
    # PM2.5 > 1000 clamped
    assert clean_value(2500.0, min_val=0.0, max_val=1000.0) == 1000.0

def test_clean_value_preserves_valid_readings():
    assert clean_value(42.368, min_val=0.0, max_val=1000.0) == 42.37
