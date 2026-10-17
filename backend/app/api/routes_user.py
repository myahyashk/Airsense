from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Reading, Forecast, Alert, AlertRead, User
from app.schemas.readings import (
    HistoryResponse,
    HistoryPoint,
    ForecastResponse,
    ForecastPoint,
    GuidanceResponse,
    GuidanceItem
)
from app.schemas.alerts import AlertsResponse, AlertOut
from app.services.aqi_calc import get_aqi_category
from app.services.forecast_model import generate_6h_forecast
from app.services.alert_service import mark_alert_read

router = APIRouter(tags=["User"])
PKT = timezone(timedelta(hours=5))

@router.get("/history", response_model=HistoryResponse)
def get_history(
    hours: int = Query(48, ge=1, le=720, description="Number of past hours of readings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch chronological readings
    readings = (
        db.query(Reading)
        .order_by(Reading.timestamp.desc())
        .limit(hours)
        .all()
    )
    # Reverse so points are in chronological order (oldest to newest)
    readings = list(reversed(readings))
    
    points = []
    for r in readings:
        t = r.timestamp
        t_str = t.isoformat() if t.tzinfo else t.replace(tzinfo=PKT).isoformat()
        points.append(
            HistoryPoint(
                timestamp=t_str,
                pm25=float(r.pm25),
                pm10=float(r.pm10),
                dust=float(r.dust),
                aqi=int(r.us_aqi)
            )
        )
    return HistoryResponse(points=points)

@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    hours: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    forecasts = (
        db.query(Forecast)
        .order_by(Forecast.target_time.asc())
        .limit(hours)
        .all()
    )
    
    if not forecasts:
        # Generate on the fly if table is empty
        generate_6h_forecast(db)
        forecasts = (
            db.query(Forecast)
            .order_by(Forecast.target_time.asc())
            .limit(hours)
            .all()
        )
        
    points = []
    gen_time_str = datetime.now(PKT).isoformat()
    model_name = "gradient_boosting_v1"
    
    for f in forecasts:
        model_name = f.model_name
        gen_t = f.generated_at
        gen_time_str = gen_t.isoformat() if gen_t.tzinfo else gen_t.replace(tzinfo=PKT).isoformat()
        
        t = f.target_time
        t_str = t.isoformat() if t.tzinfo else t.replace(tzinfo=PKT).isoformat()
        points.append(
            ForecastPoint(
                timestamp=t_str,
                aqi_pred=int(f.aqi_pred),
                category=f.category
            )
        )
        
    return ForecastResponse(
        generated_at=gen_time_str,
        model=model_name,
        points=points
    )

@router.get("/alerts", response_model=AlertsResponse)
def get_alerts(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch alerts ordered by created_at desc
    alerts = (
        db.query(Alert)
        .order_by(Alert.active.desc(), Alert.created_at.desc())
        .limit(limit)
        .all()
    )
    
    # Read status set for current user
    read_alert_ids = set(
        r.alert_id for r in db.query(AlertRead.alert_id).filter(AlertRead.user_id == current_user.id).all()
    )
    
    items = []
    for a in alerts:
        created_t = a.created_at
        created_str = created_t.isoformat() if created_t.tzinfo else created_t.replace(tzinfo=PKT).isoformat()
        
        expires_str = None
        if a.expires_at:
            exp_t = a.expires_at
            expires_str = exp_t.isoformat() if exp_t.tzinfo else exp_t.replace(tzinfo=PKT).isoformat()
            
        is_read = a.id in read_alert_ids
        creator_name = a.created_by.name if a.created_by else None
        
        items.append(
            AlertOut(
                id=a.id,
                source=a.source,
                severity=a.severity,
                title=a.title,
                message=a.message,
                created_at=created_str,
                expires_at=expires_str,
                active=bool(a.active),
                read=is_read,
                created_by=creator_name
            )
        )
    return AlertsResponse(items=items)

@router.post("/alerts/{id}/read")
def read_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        
    mark_alert_read(db, current_user.id, alert.id)
    return {"ok": True}

@router.get("/guidance", response_model=GuidanceResponse)
def get_guidance(
    category: Optional[str] = Query(None, description="Optional target AQI category"),
    current_user: User = Depends(get_current_user)
):
    target_category = category if category else "Moderate"
    
    guidance_data = {
        "Good": [
            GuidanceItem(audience="General Public", icon="Smile", title="Great Day for Outdoors", body="Air quality is ideal for all outdoor sports, exercise, and activities around the BBSUTSD campus."),
            GuidanceItem(audience="Sensitive Groups", icon="Heart", title="No Restrictions", body="No special health precautions required. Breathe easy!"),
            GuidanceItem(audience="Ventilation", icon="Wind", title="Open Windows", body="Natural ventilation is strongly encouraged to refresh indoor campus spaces."),
        ],
        "Moderate": [
            GuidanceItem(audience="General Public", icon="UserCheck", title="Normal Activity Permitted", body="Air quality is generally acceptable for most people studying or working on campus."),
            GuidanceItem(audience="Sensitive Groups", icon="AlertCircle", title="Monitor Unusual Symptoms", body="Unusually sensitive individuals with asthma or allergies should observe coughing or shortness of breath."),
            GuidanceItem(audience="Ventilation", icon="Home", title="Moderate Ventilation", body="Keep windows open during early mornings; consider closing during dusty midday breezes."),
        ],
        "Unhealthy for Sensitive Groups": [
            GuidanceItem(audience="Sensitive Groups", icon="ShieldAlert", title="Reduce Prolonged Exertion", body="Students and staff with asthma, cardiovascular or respiratory conditions should take breaks and reduce intense outdoor sports."),
            GuidanceItem(audience="General Public", icon="Users", title="Moderate Outdoor Work", body="Outdoor workouts are acceptable but take frequent rest periods if breathing feels heavy."),
            GuidanceItem(audience="Facial Protection", icon="Shield", title="Wear a Mask Near Dust", body="Carry a light cloth or surgical mask, particularly along dusty roadways in Khairpur."),
        ],
        "Unhealthy": [
            GuidanceItem(audience="General Public", icon="AlertTriangle", title="Avoid Strenuous Sports", body="Everyone should avoid prolonged heavy outdoor exertion and move athletic activities indoors."),
            GuidanceItem(audience="Sensitive Groups", icon="HeartOff", title="Stay Indoors", body="Sensitive individuals should remain inside air-conditioned or filtered campus buildings."),
            GuidanceItem(audience="Masks & Windows", icon="ShieldCheck", title="N95 Masks & Keep Windows Shut", body="Wear an N95 or KN95 particulate respirator when walking outside. Keep classroom and dorm windows tightly shut."),
        ],
        "Very Unhealthy": [
            GuidanceItem(audience="General Public", icon="AlertOctagon", title="Health Alert: Serious Risk", body="Active children, adults, and people with respiratory illness should avoid all outdoor physical activity."),
            GuidanceItem(audience="Campus Transit", icon="Compass", title="Minimize Walking Transit", body="Use covered campus transit if travelling between departments; avoid staying in open courtyards."),
            GuidanceItem(audience="Air Purification", icon="Cpu", title="Filter Indoor Air", body="Run indoor HEPA or active carbon filtration units at maximum speed."),
        ],
        "Hazardous": [
            GuidanceItem(audience="Emergency Warning", icon="Biohazard", title="Emergency Campus Advisory", body="Everyone is at high risk of experiencing adverse health effects. University administration recommends staying indoors."),
            GuidanceItem(audience="Mandatory Precautions", icon="ShieldAlert", title="Strict Protective Masks", body="Fitted N95/P100 respirators are required if outdoor transit cannot be avoided."),
            GuidanceItem(audience="Indoor Protection", icon="Lock", title="Seal Openings", body="Close all vents, seal perimeter windows, and avoid using outdoor air intake fans."),
        ]
    }
    
    items = guidance_data.get(target_category, guidance_data["Moderate"])
    return GuidanceResponse(category=target_category, items=items)
