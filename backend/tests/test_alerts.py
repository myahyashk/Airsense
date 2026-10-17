from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, Reading, Forecast, Alert, SystemSetting
from app.services.alert_service import check_and_create_alerts, get_thresholds

def setup_in_memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(SystemSetting(key="warning_threshold", value="101"))
    db.add(SystemSetting(key="danger_threshold", value="151"))
    db.commit()
    return db

def test_alert_deduplication_and_trigger():
    db = setup_in_memory_db()
    now_utc = datetime.now(timezone.utc)
    
    # 1. Add reading with AQI 165 (exceeding danger 151)
    reading = Reading(
        timestamp=now_utc,
        pm25=75.0,
        pm10=180.0,
        dust=120.0,
        us_aqi=165,
        temperature=30.0,
        humidity=40.0,
        wind_speed=8.0
    )
    db.add(reading)
    db.commit()
    
    # Run alert check once
    check_and_create_alerts(db)
    
    danger_alerts = db.query(Alert).filter(Alert.severity == "danger").all()
    assert len(danger_alerts) == 1
    assert "Unsafe Air Quality" in danger_alerts[0].title
    
    # Run alert check second time with same conditions - deduplication must prevent second alert!
    check_and_create_alerts(db)
    danger_alerts_after = db.query(Alert).filter(Alert.severity == "danger").all()
    assert len(danger_alerts_after) == 1

def test_proactive_forecast_alert():
    db = setup_in_memory_db()
    now_utc = datetime.now(timezone.utc)
    
    # Current reading is safe (AQI 60)
    safe_reading = Reading(
        timestamp=now_utc,
        pm25=15.0,
        pm10=40.0,
        dust=30.0,
        us_aqi=60,
        temperature=28.0,
        humidity=45.0,
        wind_speed=12.0
    )
    db.add(safe_reading)
    
    # Forecast predicts 155 (danger) 2 hours ahead
    forecast = Forecast(
        generated_at=now_utc,
        target_time=now_utc + timedelta(hours=2),
        aqi_pred=155,
        category="Unhealthy",
        model_name="gradient_boosting_v1"
    )
    db.add(forecast)
    db.commit()
    
    check_and_create_alerts(db)
    
    fc_alerts = db.query(Alert).filter(Alert.source == "auto", Alert.severity == "danger").all()
    assert len(fc_alerts) == 1
    assert "Advance Warning: Dangerous AQI Predicted" in fc_alerts[0].title
    assert "AQI is expected to reach Unhealthy" in fc_alerts[0].message
