import pytest
from app.services.aqi_calc import (
    get_aqi_category,
    get_aqi_meta,
    calculate_pm25_aqi,
    calculate_pm10_aqi,
    AQI_CATEGORIES
)

def test_get_aqi_category_boundaries():
    assert get_aqi_category(0) == "Good"
    assert get_aqi_category(50) == "Good"
    assert get_aqi_category(51) == "Moderate"
    assert get_aqi_category(100) == "Moderate"
    assert get_aqi_category(101) == "Unhealthy for Sensitive Groups"
    assert get_aqi_category(150) == "Unhealthy for Sensitive Groups"
    assert get_aqi_category(151) == "Unhealthy"
    assert get_aqi_category(200) == "Unhealthy"
    assert get_aqi_category(201) == "Very Unhealthy"
    assert get_aqi_category(300) == "Very Unhealthy"
    assert get_aqi_category(301) == "Hazardous"
    assert get_aqi_category(450) == "Hazardous"

def test_get_aqi_category_edge_cases():
    assert get_aqi_category(-10) == "Good"  # Clamped to 0
    assert get_aqi_category(None) == "Good"
    assert get_aqi_category(999) == "Hazardous"

def test_calculate_pm25_aqi_piecewise():
    # 0.0 -> 0 AQI
    assert calculate_pm25_aqi(0.0) == 0
    # 12.0 -> 50 AQI
    assert calculate_pm25_aqi(12.0) == 50
    # 35.4 -> 100 AQI
    assert calculate_pm25_aqi(35.4) == 100
    # 55.4 -> 150 AQI
    assert calculate_pm25_aqi(55.4) == 150
    # 150.4 -> 200 AQI
    assert calculate_pm25_aqi(150.4) == 200
    # Extreme upper limit
    assert calculate_pm25_aqi(600.0) == 500

def test_calculate_pm10_aqi_piecewise():
    assert calculate_pm10_aqi(0) == 0
    assert calculate_pm10_aqi(54) == 50
    assert calculate_pm10_aqi(154) == 100
    assert calculate_pm10_aqi(700) == 500

def test_aqi_meta_structure():
    meta = get_aqi_meta(125)
    assert meta["category"] == "Unhealthy for Sensitive Groups"
    assert meta["color"] == "#f97316"
    assert meta["severity"] == "warning"
