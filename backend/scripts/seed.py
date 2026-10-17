import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.logging import logger
from app.core.security import get_password_hash
from app.db.database import engine, Base, SessionLocal
from app.db.models import User, SystemSetting
from app.services.ingestion import sync_ingest_data, set_setting
from app.services.forecast_model import train_forecast_pipeline, generate_6h_forecast
from app.services.alert_service import check_and_create_alerts

def seed_database():
    print("=" * 60)
    print("AirSense Database Seeding Script")
    print(f"Target: {settings.LOCATION_NAME} ({settings.LATITUDE} N, {settings.LONGITUDE} E)")
    print("=" * 60)

    # 1. Initialize Tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 2. Seed Default Settings
        if not db.query(SystemSetting).filter(SystemSetting.key == "warning_threshold").first():
            db.add(SystemSetting(key="warning_threshold", value=str(settings.DEFAULT_WARNING_THRESHOLD)))
        if not db.query(SystemSetting).filter(SystemSetting.key == "danger_threshold").first():
            db.add(SystemSetting(key="danger_threshold", value=str(settings.DEFAULT_DANGER_THRESHOLD)))
        if not db.query(SystemSetting).filter(SystemSetting.key == "source_status").first():
            db.add(SystemSetting(key="source_status", value="live"))
        db.commit()

        # 3. Seed Admin User
        admin_email = settings.ADMIN_EMAIL.lower().strip()
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                name=settings.ADMIN_NAME,
                email=admin_email,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
                active=True,
                notify_enabled=True,
                notify_threshold=settings.DEFAULT_WARNING_THRESHOLD,
                created_at=datetime.now(timezone.utc)
            )
            db.add(admin_user)
            db.commit()
            print(f"[+] Admin account created: {admin_email}")
        else:
            admin_user.password_hash = get_password_hash(settings.ADMIN_PASSWORD)
            admin_user.role = "admin"
            admin_user.active = True
            db.commit()
            print(f"[i] Admin account verified: {admin_email}")

        # 4. Seed Sample User
        sample_email = settings.SAMPLE_USER_EMAIL.lower().strip()
        sample_user = db.query(User).filter(User.email == sample_email).first()
        if not sample_user:
            sample_user = User(
                name=settings.SAMPLE_USER_NAME,
                email=sample_email,
                password_hash=get_password_hash(settings.SAMPLE_USER_PASSWORD),
                role="user",
                active=True,
                notify_enabled=True,
                notify_threshold=settings.DEFAULT_WARNING_THRESHOLD,
                created_at=datetime.now(timezone.utc)
            )
            db.add(sample_user)
            db.commit()
            print(f"[+] Sample user account created: {sample_email}")
        else:
            sample_user.password_hash = get_password_hash(settings.SAMPLE_USER_PASSWORD)
            db.commit()
            print(f"[i] Sample user account verified: {sample_email}")

        # 5. Ingest 35 days of history from Open-Meteo
        print("\n[>>] Fetching 35 days of historical air quality & weather data from Open-Meteo...")
        count = sync_ingest_data(db, past_days=35)
        print(f"[+] Ingestion complete. Stored {count} hourly readings.")

        # 6. Train initial GBR Forecasting Model
        print("\n[>>] Training initial explainable GradientBoostingRegressor forecasting model...")
        metrics = train_forecast_pipeline(db)
        print(f"[+] Model trained: MAE={metrics['mae']} (Baseline MAE={metrics['baseline_mae']}), RMSE={metrics['rmse']} (Baseline RMSE={metrics['baseline_rmse']})")

        # 7. Generate 6h Forecast & Initial Alerts
        print("\n[>>] Generating 6-hour forecast and evaluating alert thresholds...")
        forecasts = generate_6h_forecast(db)
        print(f"[+] Generated {len(forecasts)} forecast steps.")
        check_and_create_alerts(db)
        print("[+] Alert threshold checks evaluated.")

        print("\n" + "=" * 60)
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print(f"Admin Email: {admin_email}")
        print(f"Sample User Email: {sample_email}")
        print("Note: Passwords configured via .env (never logged in production)")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[-] Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
