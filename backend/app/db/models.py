from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "user" | "admin"
    active = Column(Boolean, default=True, nullable=False)
    notify_enabled = Column(Boolean, default=True, nullable=False)
    notify_threshold = Column(Integer, default=101, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    reads = relationship("AlertRead", back_populates="user", cascade="all, delete-orphan")


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, unique=True, index=True, nullable=False)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=False)
    dust = Column(Float, nullable=False)
    us_aqi = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, index=True, nullable=False)
    target_time = Column(DateTime, index=True, nullable=False)
    aqi_pred = Column(Integer, nullable=False)
    category = Column(String(50), nullable=False)
    model_name = Column(String(50), default="gradient_boosting_v1", nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(20), nullable=False)  # "auto" | "manual"
    severity = Column(String(20), nullable=False)  # "info" | "warning" | "danger"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    dedup_key = Column(String(255), unique=True, index=True, nullable=True)

    created_by = relationship("User", foreign_keys=[created_by_id])
    reads = relationship("AlertRead", back_populates="alert", cascade="all, delete-orphan")


class AlertRead(Base):
    __tablename__ = "alert_reads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="reads")
    alert = relationship("Alert", back_populates="reads")

    __table_args__ = (
        UniqueConstraint("user_id", "alert_id", name="uq_user_alert_read"),
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime, default=utc_now, index=True, nullable=False)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(100), nullable=True)


class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    trained_at = Column(DateTime, default=utc_now, nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    baseline_mae = Column(Float, nullable=False)
    baseline_rmse = Column(Float, nullable=False)
    sample_count = Column(Integer, nullable=False)
    status = Column(String(50), default="active", nullable=False)
