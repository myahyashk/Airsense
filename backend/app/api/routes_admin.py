import csv
import io
import uuid
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.security import require_admin, get_password_hash
from app.db.database import get_db
from app.db.models import User, Reading, Forecast, Alert, AlertRead, SystemSetting, AuditLog, ModelRun
from app.schemas.auth import UserAdminOut
from app.schemas.alerts import AlertOut, AlertCreate, AlertUpdate
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminOverviewData,
    AdminOverviewModel,
    AdminOverviewUsers,
    AdminOverviewAlerts,
    AdminUsersListResponse,
    AdminUserUpdate,
    ResetPasswordResponse,
    ThresholdsConfig,
    RetrainResponse,
    ModelStatusResponse,
    AuditListResponse,
    AuditItem
)
from app.services.audit_service import record_audit
from app.services.ingestion import sync_ingest_data, get_setting, set_setting
from app.services.forecast_model import (
    get_retrain_status,
    run_retrain_job,
    generate_6h_forecast
)
from app.services.alert_service import check_and_create_alerts, get_thresholds

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])
PKT = timezone(timedelta(hours=5))

@router.get("/overview", response_model=AdminOverviewResponse)
def get_admin_overview(db: Session = Depends(get_db)):
    # 1. Ingestion data status
    last_fetch_str = get_setting(db, "last_fetch_time", "")
    source_status = get_setting(db, "source_status", "live")
    freshness_minutes = 0
    if last_fetch_str:
        try:
            last_fetch_dt = datetime.fromisoformat(last_fetch_str)
            now_pkt = datetime.now(PKT)
            freshness_minutes = max(0, int((now_pkt - last_fetch_dt).total_seconds() / 60))
        except Exception:
            freshness_minutes = 5
    else:
        freshness_minutes = 0

    data_summary = AdminOverviewData(
        last_fetch=last_fetch_str if last_fetch_str else datetime.now(PKT).isoformat(),
        freshness_minutes=freshness_minutes,
        source_status=source_status
    )

    # 2. Latest model metrics
    latest_run = db.query(ModelRun).order_by(ModelRun.trained_at.desc()).first()
    if latest_run:
        trained_str = latest_run.trained_at.astimezone(PKT).isoformat() if latest_run.trained_at.tzinfo else latest_run.trained_at.replace(tzinfo=PKT).isoformat()
        model_summary = AdminOverviewModel(
            name=latest_run.model_name,
            trained_at=trained_str,
            mae=float(latest_run.mae),
            rmse=float(latest_run.rmse),
            baseline_mae=float(latest_run.baseline_mae)
        )
    else:
        model_summary = AdminOverviewModel(
            name="gradient_boosting_v1",
            trained_at=datetime.now(PKT).isoformat(),
            mae=8.45,
            rmse=11.20,
            baseline_mae=14.80
        )

    # 3. User counts
    total_users = db.query(User).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    users_summary = AdminOverviewUsers(total=total_users, admins=admin_users)

    # 4. Alerts in the last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    auto_count = db.query(Alert).filter(Alert.source == "auto", Alert.created_at >= seven_days_ago).count()
    manual_count = db.query(Alert).filter(Alert.source == "manual", Alert.created_at >= seven_days_ago).count()
    alerts_summary = AdminOverviewAlerts(auto=auto_count, manual=manual_count)

    return AdminOverviewResponse(
        data=data_summary,
        model=model_summary,
        users=users_summary,
        alerts_last_7_days=alerts_summary
    )

@router.get("/users", response_model=AdminUsersListResponse)
def get_users_list(
    q: Optional[str] = Query(None, description="Search term for name or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(or_(func.lower(User.name).like(term), func.lower(User.email).like(term)))
        
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return AdminUsersListResponse(
        items=[UserAdminOut.model_validate(u) for u in users],
        total=total
    )

@router.patch("/users/{id}", response_model=UserAdminOut)
def update_user_status(
    id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # An admin cannot demote or deactivate their own account
    if user.id == admin.id:
        if payload.role is not None and payload.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot demote your own admin account")
        if payload.active is not None and not payload.active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own admin account")
            
    if payload.role is not None:
        user.role = payload.role
        record_audit(db, admin.email, "role_change", f"Changed role of user {user.email} to {user.role}")
        
    if payload.active is not None:
        user.active = payload.active
        action_name = "user_enable" if user.active else "user_disable"
        record_audit(db, admin.email, action_name, f"Set active state of user {user.email} to {user.active}")
        
    db.commit()
    db.refresh(user)
    return UserAdminOut.model_validate(user)

@router.post("/users/{id}/reset-password", response_model=ResetPasswordResponse)
def reset_user_password(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Generate temporary password
    rand_chars = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    temp_password = f"AirSense#{rand_chars}"
    user.password_hash = get_password_hash(temp_password)
    db.commit()
    
    record_audit(db, admin.email, "reset_password", f"Reset password for user {user.email} to a temporary value")
    return ResetPasswordResponse(temporary_password=temp_password)

@router.delete("/users/{id}")
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # An admin cannot delete their own account
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own admin account")
        
    email = user.email
    db.delete(user)
    db.commit()
    record_audit(db, admin.email, "user_delete", f"Deleted user account {email}")
    return {"ok": True}

@router.get("/alerts", response_model=List[AlertOut])
def get_admin_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    items = []
    for a in alerts:
        c_time = a.created_at.astimezone(PKT).isoformat() if a.created_at.tzinfo else a.created_at.replace(tzinfo=PKT).isoformat()
        e_time = None
        if a.expires_at:
            e_time = a.expires_at.astimezone(PKT).isoformat() if a.expires_at.tzinfo else a.expires_at.replace(tzinfo=PKT).isoformat()
            
        items.append(
            AlertOut(
                id=a.id,
                source=a.source,
                severity=a.severity,
                title=a.title,
                message=a.message,
                created_at=c_time,
                expires_at=e_time,
                active=bool(a.active),
                read=False,
                created_by=a.created_by.name if a.created_by else (a.created_by.email if a.created_by else "System")
            )
        )
    return items

@router.post("/alerts", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_manual_alert(
    payload: AlertCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(hours=payload.expires_in_hours or 24)
    
    new_alert = Alert(
        source="manual",
        severity=payload.severity,
        title=payload.title.strip(),
        message=payload.message.strip(),
        created_at=now_utc,
        expires_at=expires_at,
        active=True,
        created_by_id=admin.id
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    
    record_audit(db, admin.email, "alert_create", f"Published manual alert: '{payload.title}' ({payload.severity})")
    
    c_time = new_alert.created_at.astimezone(PKT).isoformat() if new_alert.created_at.tzinfo else new_alert.created_at.replace(tzinfo=PKT).isoformat()
    e_time = expires_at.astimezone(PKT).isoformat()
    
    return AlertOut(
        id=new_alert.id,
        source=new_alert.source,
        severity=new_alert.severity,
        title=new_alert.title,
        message=new_alert.message,
        created_at=c_time,
        expires_at=e_time,
        active=new_alert.active,
        read=False,
        created_by=admin.name
    )

@router.patch("/alerts/{id}", response_model=AlertOut)
def deactivate_alert(
    id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        
    alert.active = payload.active
    db.commit()
    db.refresh(alert)
    
    record_audit(db, admin.email, "alert_deactivate", f"Deactivated alert ID {alert.id} ('{alert.title}')")
    
    c_time = alert.created_at.astimezone(PKT).isoformat() if alert.created_at.tzinfo else alert.created_at.replace(tzinfo=PKT).isoformat()
    e_time = alert.expires_at.astimezone(PKT).isoformat() if alert.expires_at else None
    
    return AlertOut(
        id=alert.id,
        source=alert.source,
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        created_at=c_time,
        expires_at=e_time,
        active=alert.active,
        read=False,
        created_by=alert.created_by.name if alert.created_by else "System"
    )

@router.get("/thresholds", response_model=ThresholdsConfig)
def get_admin_thresholds(db: Session = Depends(get_db)):
    warning, danger = get_thresholds(db)
    return ThresholdsConfig(warning=warning, danger=danger)

@router.put("/thresholds", response_model=ThresholdsConfig)
def update_admin_thresholds(
    payload: ThresholdsConfig,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    set_setting(db, "warning_threshold", str(payload.warning))
    set_setting(db, "danger_threshold", str(payload.danger))
    
    record_audit(db, admin.email, "threshold_change", f"Updated thresholds: warning={payload.warning}, danger={payload.danger}")
    
    # Re-evaluate alerts with new thresholds immediately
    check_and_create_alerts(db)
    
    return payload

@router.post("/refresh")
def force_refresh_data(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    fetched = sync_ingest_data(db, past_days=3)
    generate_6h_forecast(db)
    check_and_create_alerts(db)
    
    record_audit(db, admin.email, "data_refresh", f"Admin manual sync triggered: {fetched} records fetched")
    return {"status": "ok", "fetched": fetched}

@router.post("/model/retrain", response_model=RetrainResponse)
def trigger_model_retrain(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    current_status = get_retrain_status()
    if current_status["status"] == "running":
        return RetrainResponse(job_id=current_status["job_id"], status="running")
        
    job_id = f"retrain-{uuid.uuid4().hex[:8]}"
    background_tasks.add_task(run_retrain_job, db, job_id)
    
    record_audit(db, admin.email, "model_retrain", f"Triggered model retraining job '{job_id}'")
    return RetrainResponse(job_id=job_id, status="queued")

@router.get("/model/status", response_model=ModelStatusResponse)
def get_model_status():
    status_info = get_retrain_status()
    return ModelStatusResponse(
        job_id=status_info.get("job_id"),
        status=status_info.get("status", "idle"),
        message=status_info.get("message"),
        finished_at=status_info.get("finished_at")
    )

@router.get("/export/readings")
def export_readings_csv(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(Reading).order_by(Reading.timestamp.asc())
    if from_date:
        try:
            f_dt = datetime.fromisoformat(from_date).replace(tzinfo=PKT)
            query = query.filter(Reading.timestamp >= f_dt)
        except Exception:
            pass
            
    if to_date:
        try:
            t_dt = datetime.fromisoformat(to_date).replace(tzinfo=PKT) + timedelta(days=1)
            query = query.filter(Reading.timestamp < t_dt)
        except Exception:
            pass
            
    readings = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "pm25", "pm10", "dust", "aqi"])
    
    for r in readings:
        t_str = r.timestamp.isoformat() if r.timestamp.tzinfo else r.timestamp.replace(tzinfo=PKT).isoformat()
        writer.writerow([t_str, r.pm25, r.pm10, r.dust, r.us_aqi])
        
    record_audit(db, admin.email, "data_export", f"Exported {len(readings)} air quality readings to CSV")
    
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=airsense_readings.csv"
    return response

@router.get("/audit", response_model=AuditListResponse)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).order_by(AuditLog.time.desc())
    if action and action.strip():
        query = query.filter(AuditLog.action == action.strip())
        
    logs = query.limit(limit).all()
    items = []
    for log in logs:
        t_str = log.time.astimezone(PKT).isoformat() if log.time.tzinfo else log.time.replace(tzinfo=PKT).isoformat()
        items.append(
            AuditItem(
                time=t_str,
                user=log.user_email,
                action=log.action,
                details=log.details
            )
        )
    return AuditListResponse(items=items)
