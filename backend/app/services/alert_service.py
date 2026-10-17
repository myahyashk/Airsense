from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.models import Alert, AlertRead, Reading, Forecast, SystemSetting, User
from app.services.aqi_calc import get_aqi_category

PKT = timezone(timedelta(hours=5))

def get_thresholds(db: Session) -> tuple[int, int]:
    w_row = db.query(SystemSetting).filter(SystemSetting.key == "warning_threshold").first()
    d_row = db.query(SystemSetting).filter(SystemSetting.key == "danger_threshold").first()
    
    warning = int(w_row.value) if w_row else settings.DEFAULT_WARNING_THRESHOLD
    danger = int(d_row.value) if d_row else settings.DEFAULT_DANGER_THRESHOLD
    return warning, danger

def check_and_create_alerts(db: Session):
    """Evaluate current readings and 6-hour forecasts against warning and danger thresholds."""
    warning_th, danger_th = get_thresholds(db)
    now_utc = datetime.now(timezone.utc)
    now_pkt = datetime.now(PKT)
    
    # 1. Clean up expired alerts
    expired_alerts = db.query(Alert).filter(Alert.active == True, Alert.expires_at < now_utc).all()
    for a in expired_alerts:
        a.active = False
    if expired_alerts:
        db.commit()

    # 2. Check latest reading
    latest_reading = db.query(Reading).order_by(Reading.timestamp.desc()).first()
    forecasts = db.query(Forecast).order_by(Forecast.target_time.asc()).limit(6).all()
    
    if not latest_reading:
        return

    current_aqi = latest_reading.us_aqi
    current_cat = get_aqi_category(current_aqi)
    
    # Assess if danger or warning is present currently
    if current_aqi >= danger_th:
        hour_slot = latest_reading.timestamp.strftime("%Y-%m-%d-%H")
        dedup_key = f"auto-curr-danger-{hour_slot}"
        
        existing = db.query(Alert).filter(Alert.dedup_key == dedup_key).first()
        if not existing:
            new_alert = Alert(
                source="auto",
                severity="danger",
                title="Immediate Campus Danger: Unsafe Air Quality",
                message=f"Current campus AQI has reached {current_aqi} ({current_cat}), exceeding the danger threshold ({danger_th}). Avoid outdoor activities and keep windows shut.",
                created_at=now_utc,
                expires_at=now_utc + timedelta(hours=3),
                active=True,
                dedup_key=dedup_key
            )
            db.add(new_alert)
            db.commit()
            logger.info(f"Auto danger alert generated: {dedup_key}")
            
    elif current_aqi >= warning_th:
        hour_slot = latest_reading.timestamp.strftime("%Y-%m-%d-%H")
        dedup_key = f"auto-curr-warn-{hour_slot}"
        
        existing = db.query(Alert).filter(Alert.dedup_key == dedup_key).first()
        if not existing:
            new_alert = Alert(
                source="auto",
                severity="warning",
                title="Campus Air Advisory: Elevated Pollution Levels",
                message=f"Current campus AQI is {current_aqi} ({current_cat}), above the warning threshold ({warning_th}). Sensitive individuals should limit prolonged outdoor exertion.",
                created_at=now_utc,
                expires_at=now_utc + timedelta(hours=3),
                active=True,
                dedup_key=dedup_key
            )
            db.add(new_alert)
            db.commit()
            logger.info(f"Auto warning alert generated: {dedup_key}")

    # 3. Check proactive forecasts (warn BEFORE the air becomes unsafe)
    for f in forecasts:
        if f.aqi_pred >= danger_th:
            t_pkt = f.target_time.astimezone(PKT) if f.target_time.tzinfo else f.target_time.replace(tzinfo=PKT)
            time_str = t_pkt.strftime("%I:%M %p")
            date_slot = t_pkt.strftime("%Y-%m-%d-%H")
            dedup_key = f"auto-fc-danger-{date_slot}"
            
            existing = db.query(Alert).filter(Alert.dedup_key == dedup_key).first()
            if not existing:
                new_alert = Alert(
                    source="auto",
                    severity="danger",
                    title="Advance Warning: Dangerous AQI Predicted",
                    message=f"AQI is expected to reach {f.category} (predicted {f.aqi_pred}) around {time_str}. Plan indoor activities accordingly.",
                    created_at=now_utc,
                    expires_at=f.target_time + timedelta(hours=2),
                    active=True,
                    dedup_key=dedup_key
                )
                db.add(new_alert)
                db.commit()
                logger.info(f"Advance danger alert generated: {dedup_key}")
            break  # Trigger earliest danger forecast
            
        elif f.aqi_pred >= warning_th:
            t_pkt = f.target_time.astimezone(PKT) if f.target_time.tzinfo else f.target_time.replace(tzinfo=PKT)
            time_str = t_pkt.strftime("%I:%M %p")
            date_slot = t_pkt.strftime("%Y-%m-%d-%H")
            dedup_key = f"auto-fc-warn-{date_slot}"
            
            existing = db.query(Alert).filter(Alert.dedup_key == dedup_key).first()
            if not existing:
                new_alert = Alert(
                    source="auto",
                    severity="warning",
                    title="Advance Advisory: Moderate Air Quality Ahead",
                    message=f"AQI is expected to reach {f.category} (predicted {f.aqi_pred}) around {time_str}.",
                    created_at=now_utc,
                    expires_at=f.target_time + timedelta(hours=2),
                    active=True,
                    dedup_key=dedup_key
                )
                db.add(new_alert)
                db.commit()
                logger.info(f"Advance warning alert generated: {dedup_key}")
            break

    # 4. Auto-deactivate older auto alerts if condition has completely cleared
    all_clear = (current_aqi < warning_th) and all(f.aqi_pred < warning_th for f in forecasts)
    if all_clear:
        active_auto_alerts = db.query(Alert).filter(Alert.source == "auto", Alert.active == True).all()
        for a in active_auto_alerts:
            # Keep alerts around for at least 30 minutes after creation before clearing
            if (now_utc - a.created_at).total_seconds() > 1800:
                a.active = False
        db.commit()

def mark_alert_read(db: Session, user_id: int, alert_id: int):
    existing = db.query(AlertRead).filter(
        AlertRead.user_id == user_id,
        AlertRead.alert_id == alert_id
    ).first()
    if not existing:
        ar = AlertRead(
            user_id=user_id,
            alert_id=alert_id,
            read_at=datetime.now(timezone.utc)
        )
        db.add(ar)
        db.commit()
