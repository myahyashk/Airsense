import pytest
from pydantic import ValidationError
from app.schemas.admin import ThresholdsConfig

def test_thresholds_valid():
    tc = ThresholdsConfig(warning=101, danger=151)
    assert tc.warning == 101
    assert tc.danger == 151

def test_thresholds_warning_must_be_lower_than_danger():
    with pytest.raises(ValidationError) as exc:
        ThresholdsConfig(warning=160, danger=150)
    assert "strictly lower than" in str(exc.value)

def test_thresholds_equal_not_allowed():
    with pytest.raises(ValidationError) as exc:
        ThresholdsConfig(warning=150, danger=150)
    assert "strictly lower than" in str(exc.value)

def test_thresholds_range_bounds():
    with pytest.raises(ValidationError):
        ThresholdsConfig(warning=-5, danger=150)
    with pytest.raises(ValidationError):
        ThresholdsConfig(warning=100, danger=550)
