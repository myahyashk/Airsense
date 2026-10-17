from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import settings
from app.core.logging import logger
from app.db.database import SessionLocal
from app.services.ingestion import sync_ingest_data
from app.services.forecast_model import generate_6h_forecast
from app.services.alert_service import check_and_create_alerts

scheduler = BackgroundScheduler(timezone="Asia/Karachi")

def periodic_refresh_job():
    """Scheduled task to ingest fresh data, recalculate forecast, and evaluate alerts."""
    logger.info("Starting scheduled periodic AirSense refresh job...")
    db = SessionLocal()
    try:
        new_records = sync_ingest_data(db, past_days=2)
        generate_6h_forecast(db)
        check_and_create_alerts(db)
        logger.info(f"Scheduled refresh job complete. Ingested {new_records} records.")
    except Exception as e:
        logger.error(f"Error in scheduled refresh job: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            periodic_refresh_job,
            trigger=IntervalTrigger(minutes=settings.FETCH_INTERVAL_MINUTES),
            id="airsense_periodic_refresh",
            name="AirSense Periodic Ingestion and Alert Check",
            replace_existing=True
        )
        scheduler.start()
        logger.info(f"APScheduler started. Running every {settings.FETCH_INTERVAL_MINUTES} minutes.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
