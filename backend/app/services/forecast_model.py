import math
import uuid
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.models import Reading, Forecast, ModelRun
from app.services.aqi_calc import get_aqi_category

PKT = timezone(timedelta(hours=5))
MODEL_FILE_PATH = settings.ML_ARTIFACT_DIR / "gbr_forecast_model.joblib"

# Retrain job concurrency management
RETRAIN_LOCK = threading.Lock()
RETRAIN_STATUS: Dict[str, Any] = {
    "job_id": None,
    "status": "idle",  # "idle" | "queued" | "running" | "done" | "failed"
    "message": None,
    "finished_at": None
}

def get_retrain_status() -> Dict[str, Any]:
    return RETRAIN_STATUS.copy()

def build_features_dataframe(readings: List[Reading]) -> pd.DataFrame:
    """Transform sequential readings into tabular feature DataFrame."""
    if not readings:
        return pd.DataFrame()
        
    records = []
    for r in readings:
        records.append({
            "timestamp": r.timestamp,
            "pm25": float(r.pm25),
            "pm10": float(r.pm10),
            "dust": float(r.dust),
            "aqi": float(r.us_aqi),
            "temp": float(r.temperature) if r.temperature is not None else 28.0,
            "hum": float(r.humidity) if r.humidity is not None else 50.0,
            "wind": float(r.wind_speed) if r.wind_speed is not None else 10.0,
        })
    df = pd.DataFrame(records).sort_values("timestamp").reset_index(drop=True)
    
    # Lag features
    for lag in [1, 2, 3, 6, 12, 24]:
        df[f"aqi_lag_{lag}"] = df["aqi"].shift(lag)
    for lag in [1, 2, 3]:
        df[f"pm25_lag_{lag}"] = df["pm25"].shift(lag)
        
    # Rolling averages
    df["aqi_roll_3"] = df["aqi"].shift(1).rolling(window=3, min_periods=1).mean()
    df["aqi_roll_6"] = df["aqi"].shift(1).rolling(window=6, min_periods=1).mean()
    df["aqi_roll_24"] = df["aqi"].shift(1).rolling(window=24, min_periods=1).mean()
    
    # Cyclical hour & day
    hours = df["timestamp"].apply(lambda t: t.hour)
    df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
    df["day_of_week"] = df["timestamp"].apply(lambda t: t.weekday())
    
    return df

FEATURE_COLS = [
    "aqi_lag_1", "aqi_lag_2", "aqi_lag_3", "aqi_lag_6", "aqi_lag_12", "aqi_lag_24",
    "pm25_lag_1", "pm25_lag_2", "pm25_lag_3",
    "aqi_roll_3", "aqi_roll_6", "aqi_roll_24",
    "hour_sin", "hour_cos", "day_of_week",
    "temp", "hum", "wind"
]

def train_forecast_pipeline(db: Session) -> Dict[str, Any]:
    """Train 6 direct GradientBoostingRegressor models (for h=1..6 hours) and compare with baselines."""
    readings = db.query(Reading).order_by(Reading.timestamp.asc()).all()
    if len(readings) < 48:
        raise ValueError(f"Insufficient reading samples for training (found {len(readings)}, need >= 48)")
        
    df = build_features_dataframe(readings)
    
    # Generate targets for horizons h = 1..6
    for h in range(1, 7):
        df[f"target_h_{h}"] = df["aqi"].shift(-h)
        
    # Drop rows where features or targets are NaN
    train_df = df.dropna().reset_index(drop=True)
    if len(train_df) < 24:
        raise ValueError(f"Insufficient valid rows after lag construction ({len(train_df)} rows)")
        
    X = train_df[FEATURE_COLS].values
    
    # Chronological 80/20 train/test split - absolutely no shuffling
    split_idx = int(len(train_df) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    
    models = {}
    mae_list = []
    rmse_list = []
    base_mae_list = []
    base_rmse_list = []
    
    # Persistence baseline is aqi_lag_1 (y_t)
    persistence_pred = train_df["aqi_lag_1"].values[split_idx:]
    
    for h in range(1, 7):
        y = train_df[f"target_h_{h}"].values
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        gbr = GradientBoostingRegressor(
            n_estimators=80,
            learning_rate=0.08,
            max_depth=3,
            random_state=42
        )
        gbr.fit(X_train, y_train)
        pred_test = gbr.predict(X_test)
        
        models[f"h_{h}"] = gbr
        
        mae = float(mean_absolute_error(y_test, pred_test))
        rmse = float(np.sqrt(mean_squared_error(y_test, pred_test)))
        mae_list.append(mae)
        rmse_list.append(rmse)
        
        # Baseline persistence comparison
        b_mae = float(mean_absolute_error(y_test, persistence_pred))
        b_rmse = float(np.sqrt(mean_squared_error(y_test, persistence_pred)))
        base_mae_list.append(b_mae)
        base_rmse_list.append(b_rmse)
        
    avg_mae = round(float(np.mean(mae_list)), 2)
    avg_rmse = round(float(np.mean(rmse_list)), 2)
    avg_base_mae = round(float(np.mean(base_mae_list)), 2)
    avg_base_rmse = round(float(np.mean(base_rmse_list)), 2)
    
    # Serialize model bundle
    artifact = {
        "models": models,
        "feature_cols": FEATURE_COLS,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "mae": avg_mae,
            "rmse": avg_rmse,
            "baseline_mae": avg_base_mae,
            "baseline_rmse": avg_base_rmse,
        }
    }
    joblib.dump(artifact, MODEL_FILE_PATH)
    
    # Record model run in DB
    run_record = ModelRun(
        model_name="gradient_boosting_v1",
        trained_at=datetime.now(timezone.utc),
        mae=avg_mae,
        rmse=avg_rmse,
        baseline_mae=avg_base_mae,
        baseline_rmse=avg_base_rmse,
        sample_count=len(train_df),
        status="active"
    )
    db.add(run_record)
    db.commit()
    
    logger.info(
        f"Trained GBR forecast model: MAE={avg_mae} (Baseline MAE={avg_base_mae}), "
        f"RMSE={avg_rmse} (Baseline RMSE={avg_base_rmse}) on {len(train_df)} samples."
    )
    
    return {
        "model_name": "gradient_boosting_v1",
        "mae": avg_mae,
        "rmse": avg_rmse,
        "baseline_mae": avg_base_mae,
        "baseline_rmse": avg_base_rmse,
        "sample_count": len(train_df)
    }

def run_retrain_job(db: Session, job_id: str):
    """Background worker for retraining."""
    global RETRAIN_STATUS
    if not RETRAIN_LOCK.acquire(blocking=False):
        logger.warning(f"Retrain job {job_id} skipped: another retrain is running.")
        return
        
    try:
        RETRAIN_STATUS["job_id"] = job_id
        RETRAIN_STATUS["status"] = "running"
        RETRAIN_STATUS["message"] = "Model retraining in progress..."
        
        result = train_forecast_pipeline(db)
        
        # Regenerate forecasts with new model
        generate_6h_forecast(db)
        
        RETRAIN_STATUS["status"] = "done"
        RETRAIN_STATUS["message"] = f"Model retrained successfully. MAE: {result['mae']} (Baseline: {result['baseline_mae']})"
        RETRAIN_STATUS["finished_at"] = datetime.now(PKT).isoformat()
    except Exception as e:
        logger.error(f"Retrain job {job_id} failed: {e}")
        RETRAIN_STATUS["status"] = "failed"
        RETRAIN_STATUS["message"] = f"Retraining failed: {str(e)}"
        RETRAIN_STATUS["finished_at"] = datetime.now(PKT).isoformat()
    finally:
        RETRAIN_LOCK.release()

def generate_6h_forecast(db: Session) -> List[Dict[str, Any]]:
    """Generate 6-hour AQI predictions from the latest readings using trained GBR or baseline fallback."""
    readings = db.query(Reading).order_by(Reading.timestamp.asc()).all()
    if not readings:
        return []
        
    latest_reading = readings[-1]
    latest_time = latest_reading.timestamp
    
    # Try loading trained ML model
    model_artifact = None
    if MODEL_FILE_PATH.exists():
        try:
            model_artifact = joblib.load(MODEL_FILE_PATH)
        except Exception as e:
            logger.warning(f"Could not load saved model artifact: {e}")
            
    df = build_features_dataframe(readings)
    forecast_points = []
    
    now_utc = datetime.now(timezone.utc)
    # Clear old forecasts
    db.query(Forecast).delete()
    
    if model_artifact and len(df) > 0:
        latest_row = df.iloc[-1:][FEATURE_COLS].values
        models = model_artifact["models"]
        
        for h in range(1, 7):
            pred_time = latest_time + timedelta(hours=h)
            model_h = models.get(f"h_{h}")
            if model_h:
                raw_pred = float(model_h.predict(latest_row)[0])
                pred_aqi = max(0, min(500, round(raw_pred)))
            else:
                pred_aqi = round(latest_reading.us_aqi)
                
            category = get_aqi_category(pred_aqi)
            
            f_record = Forecast(
                generated_at=now_utc,
                target_time=pred_time,
                aqi_pred=pred_aqi,
                category=category,
                model_name="gradient_boosting_v1"
            )
            db.add(f_record)
            forecast_points.append({
                "timestamp": pred_time.isoformat(),
                "aqi_pred": pred_aqi,
                "category": category
            })
    else:
        # Graceful baseline persistence fallback if no model trained yet
        for h in range(1, 7):
            pred_time = latest_time + timedelta(hours=h)
            pred_aqi = round(latest_reading.us_aqi)
            category = get_aqi_category(pred_aqi)
            
            f_record = Forecast(
                generated_at=now_utc,
                target_time=pred_time,
                aqi_pred=pred_aqi,
                category=category,
                model_name="persistence_baseline"
            )
            db.add(f_record)
            forecast_points.append({
                "timestamp": pred_time.isoformat(),
                "aqi_pred": pred_aqi,
                "category": category
            })
            
    db.commit()
    logger.info(f"Generated 6-hour forecast from {latest_time.isoformat()}.")
    return forecast_points
