from typing import Dict, Any

AQI_CATEGORIES = [
    {"min": 0, "max": 50, "category": "Good", "color": "#10b981", "severity": "info", "icon": "Smile"},
    {"min": 51, "max": 100, "category": "Moderate", "color": "#eab308", "severity": "info", "icon": "Meh"},
    {"min": 101, "max": 150, "category": "Unhealthy for Sensitive Groups", "color": "#f97316", "severity": "warning", "icon": "AlertTriangle"},
    {"min": 151, "max": 200, "category": "Unhealthy", "color": "#ef4444", "severity": "danger", "icon": "AlertCircle"},
    {"min": 201, "max": 300, "category": "Very Unhealthy", "color": "#8b5cf6", "severity": "danger", "icon": "Skull"},
    {"min": 301, "max": 9999, "category": "Hazardous", "color": "#881337", "severity": "danger", "icon": "Biohazard"},
]

def get_aqi_category(aqi: int | float) -> str:
    """Return the EPA category name for an AQI value."""
    aqi_val = round(aqi) if aqi is not None else 0
    if aqi_val < 0:
        aqi_val = 0
    for cat in AQI_CATEGORIES:
        if cat["min"] <= aqi_val <= cat["max"]:
            return cat["category"]
    return "Hazardous"

def get_aqi_meta(aqi: int | float) -> Dict[str, Any]:
    """Return category metadata including label, color, icon, and severity."""
    aqi_val = round(aqi) if aqi is not None else 0
    if aqi_val < 0:
        aqi_val = 0
    for cat in AQI_CATEGORIES:
        if cat["min"] <= aqi_val <= cat["max"]:
            return cat
    return AQI_CATEGORIES[-1]

def calculate_pm25_aqi(pm25: float) -> int:
    """Calculate US EPA AQI from PM2.5 concentration in ug/m3 using official piecewise linear formula."""
    if pm25 is None or pm25 < 0:
        return 0
    c = round(pm25, 1)
    
    # EPA PM2.5 breakpoints: (C_low, C_high, I_low, I_high)
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]
    
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= c <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return round(aqi)
            
    # Beyond 500.4 limit
    if c > 500.4:
        return 500
    return 0

def calculate_pm10_aqi(pm10: float) -> int:
    """Calculate US EPA AQI from PM10 concentration in ug/m3."""
    if pm10 is None or pm10 < 0:
        return 0
    c = round(pm10)
    breakpoints = [
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= c <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return round(aqi)
    if c > 604:
        return 500
    return 0
