from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import Reading, SystemSetting
from app.schemas.readings import CurrentReadingOut
from app.services.aqi_calc import get_aqi_category

router = APIRouter(tags=["Public"])
PKT = timezone(timedelta(hours=5))

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    status_setting = db.query(SystemSetting).filter(SystemSetting.key == "source_status").first()
    data_source = status_setting.value if status_setting else "live"
    return {
        "status": "ok",
        "time": datetime.now(PKT).isoformat(),
        "data_source": data_source
    }

@router.get("/current", response_model=CurrentReadingOut)
def get_current(db: Session = Depends(get_db)):
    reading = db.query(Reading).order_by(Reading.timestamp.desc()).first()
    if not reading:
        # Fallback to realistic campus baseline if no data stored yet
        now = datetime.now(PKT)
        return CurrentReadingOut(
            timestamp=now.isoformat(),
            location=settings.LOCATION_NAME,
            pm25=35.0,
            pm10=85.0,
            dust=65.0,
            aqi=99,
            category=get_aqi_category(99)
        )
    
    t = reading.timestamp
    t_str = t.isoformat() if t.tzinfo else t.replace(tzinfo=PKT).isoformat()
    
    return CurrentReadingOut(
        timestamp=t_str,
        location=settings.LOCATION_NAME,
        pm25=float(reading.pm25),
        pm10=float(reading.pm10),
        dust=float(reading.dust),
        aqi=int(reading.us_aqi),
        category=get_aqi_category(reading.us_aqi)
    )
