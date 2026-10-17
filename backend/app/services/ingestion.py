import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.models import Reading, SystemSetting
from app.services.aqi_calc import calculate_pm25_aqi, get_aqi_category

OPEN_METEO_AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# Pakistan Standard Time (PKT) UTC+5
PKT = timezone(timedelta(hours=5))

def parse_iso_karachi(time_str: str) -> datetime:
    """Parse '2026-10-17T14:00' from Open-Meteo as Asia/Karachi timezone (+05:00)."""
    dt = datetime.fromisoformat(time_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=PKT)
    return dt

def clean_value(val: Optional[float], min_val: float = 0.0, max_val: float = 2000.0, fallback: float = 0.0) -> float:
    """Handle None, NaN, negative and extreme outlier values."""
    if val is None or math.isnan(val):
        return fallback
    if val < min_val:
        return min_val
    if val > max_val:
        return max_val
    return round(float(val), 2)

def set_setting(db: Session, key: str, value: str):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        setting = SystemSetting(key=key, value=value, updated_at=datetime.now(timezone.utc))
        db.add(setting)
    else:
        setting.value = value
        setting.updated_at = datetime.now(timezone.utc)
    db.commit()

def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting else default

async def fetch_open_meteo_data(past_days: int = 2) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Fetch air quality and weather data concurrently with timeouts and retry."""
    air_params = {
        "latitude": settings.LATITUDE,
        "longitude": settings.LONGITUDE,
        "hourly": "pm10,pm2_5,dust,us_aqi",
        "timezone": settings.TIMEZONE,
        "past_days": past_days,
        "forecast_days": 1
    }
    weather_params = {
        "latitude": settings.LATITUDE,
        "longitude": settings.LONGITUDE,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "timezone": settings.TIMEZONE,
        "past_days": past_days,
        "forecast_days": 1
    }

    # Resilient client with timeouts and 1 retry
    timeout = httpx.Timeout(15.0, connect=5.0)
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                air_res = await client.get(OPEN_METEO_AIR_URL, params=air_params)
                weather_res = await client.get(OPEN_METEO_WEATHER_URL, params=weather_params)
                
                air_res.raise_for_status()
                weather_res.raise_for_status()
                
                return air_res.json(), weather_res.json()
        except Exception as e:
            if attempt == 1:
                logger.warning(f"Open-Meteo fetch failed on attempt {attempt + 1}: {e}")
                raise e
            logger.info("Retrying Open-Meteo fetch once...")

def sync_ingest_data(db: Session, past_days: int = 35) -> int:
    """Synchronous ingestion wrapper for startup seed or background task."""
    air_params = {
        "latitude": settings.LATITUDE,
        "longitude": settings.LONGITUDE,
        "hourly": "pm10,pm2_5,dust,us_aqi",
        "timezone": settings.TIMEZONE,
        "past_days": past_days,
        "forecast_days": 1
    }
    weather_params = {
        "latitude": settings.LATITUDE,
        "longitude": settings.LONGITUDE,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "timezone": settings.TIMEZONE,
        "past_days": past_days,
        "forecast_days": 1
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            air_res = client.get(OPEN_METEO_AIR_URL, params=air_params)
            weather_res = client.get(OPEN_METEO_WEATHER_URL, params=weather_params)
            air_res.raise_for_status()
            weather_res.raise_for_status()
            
            air_json = air_res.json()
            weather_json = weather_res.json()
            
            saved_count = process_and_store_readings(db, air_json, weather_json)
            set_setting(db, "source_status", "live")
            set_setting(db, "last_fetch_time", datetime.now(PKT).isoformat())
            return saved_count
    except Exception as e:
        logger.error(f"Ingestion failed: {e}. Switching source_status to degraded.")
        set_setting(db, "source_status", "degraded")
        return 0

def process_and_store_readings(db: Session, air_data: Dict[str, Any], weather_data: Dict[str, Any]) -> int:
    """Parse, clean, deduplicate and save readings into the database."""
    air_hourly = air_data.get("hourly", {})
    weather_hourly = weather_data.get("hourly", {})
    
    times = air_hourly.get("time", [])
    pm10_list = air_hourly.get("pm10", [])
    pm25_list = air_hourly.get("pm2_5", [])
    dust_list = air_hourly.get("dust", [])
    us_aqi_list = air_hourly.get("us_aqi", [])
    
    # Weather map by timestamp string
    weather_times = weather_hourly.get("time", [])
    temp_list = weather_hourly.get("temperature_2m", [])
    hum_list = weather_hourly.get("relative_humidity_2m", [])
    wind_list = weather_hourly.get("wind_speed_10m", [])
    
    weather_map = {}
    for i, wt in enumerate(weather_times):
        weather_map[wt] = {
            "temp": temp_list[i] if i < len(temp_list) else None,
            "hum": hum_list[i] if i < len(hum_list) else None,
            "wind": wind_list[i] if i < len(wind_list) else None,
        }

    # Dedup timestamps within the current payload
    seen_times = set()
    cleaned_rows = []
    
    for i, t_str in enumerate(times):
        if t_str in seen_times:
            continue
        seen_times.add(t_str)
        
        parsed_dt = parse_iso_karachi(t_str)
        
        raw_pm25 = pm25_list[i] if i < len(pm25_list) else None
        raw_pm10 = pm10_list[i] if i < len(pm10_list) else None
        raw_dust = dust_list[i] if i < len(dust_list) else None
        raw_aqi = us_aqi_list[i] if i < len(us_aqi_list) else None
        
        pm25 = clean_value(raw_pm25, 0.0, 1000.0, fallback=25.0)
        pm10 = clean_value(raw_pm10, 0.0, 2000.0, fallback=50.0)
        dust = clean_value(raw_dust, 0.0, 2000.0, fallback=40.0)
        
        if raw_aqi is not None and not math.isnan(raw_aqi) and 0 <= raw_aqi <= 500:
            aqi = int(raw_aqi)
        else:
            aqi = calculate_pm25_aqi(pm25)
            
        w_info = weather_map.get(t_str, {})
        temp = clean_value(w_info.get("temp"), -10.0, 60.0, fallback=28.0)
        hum = clean_value(w_info.get("hum"), 0.0, 100.0, fallback=45.0)
        wind = clean_value(w_info.get("wind"), 0.0, 150.0, fallback=10.0)
        
        cleaned_rows.append({
            "timestamp": parsed_dt,
            "pm25": pm25,
            "pm10": pm10,
            "dust": dust,
            "us_aqi": aqi,
            "temperature": temp,
            "humidity": hum,
            "wind_speed": wind,
        })

    # Save or update into SQLite
    saved_count = 0
    for row in cleaned_rows:
        existing = db.query(Reading).filter(Reading.timestamp == row["timestamp"]).first()
        if existing:
            existing.pm25 = row["pm25"]
            existing.pm10 = row["pm10"]
            existing.dust = row["dust"]
            existing.us_aqi = row["us_aqi"]
            existing.temperature = row["temperature"]
            existing.humidity = row["humidity"]
            existing.wind_speed = row["wind_speed"]
        else:
            new_reading = Reading(
                timestamp=row["timestamp"],
                pm25=row["pm25"],
                pm10=row["pm10"],
                dust=row["dust"],
                us_aqi=row["us_aqi"],
                temperature=row["temperature"],
                humidity=row["humidity"],
                wind_speed=row["wind_speed"],
            )
            db.add(new_reading)
            saved_count += 1
            
    db.commit()
    logger.info(f"Ingested and synchronized {len(cleaned_rows)} readings ({saved_count} new).")
    return saved_count

def get_latest_reading(db: Session) -> Optional[Reading]:
    """Retrieve the latest stored reading, guaranteed not to crash."""
    return db.query(Reading).order_by(Reading.timestamp.desc()).first()
