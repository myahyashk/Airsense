from datetime import datetime, timezone, timedelta
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, Reading, ModelRun
from app.services.forecast_model import build_features_dataframe, train_forecast_pipeline

def test_forecast_pipeline_on_fixture():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    start_time = datetime(2026, 10, 1, 0, 0, tzinfo=timezone.utc)
    readings = []
    
    # Generate 60 synthetic hourly readings with realistic patterns
    for i in range(60):
        t = start_time + timedelta(hours=i)
        # Diurnal pattern
        hour = i % 24
        base_aqi = 80 + 30 * np.sin(2 * np.pi * hour / 24) + (i * 0.1)
        aqi = int(max(20, min(250, base_aqi)))
        
        r = Reading(
            timestamp=t,
            pm25=float(aqi * 0.35),
            pm10=float(aqi * 0.8),
            dust=float(aqi * 0.6),
            us_aqi=aqi,
            temperature=25.0 + 5.0 * np.sin(2 * np.pi * hour / 24),
            humidity=50.0 - 10.0 * np.sin(2 * np.pi * hour / 24),
            wind_speed=8.0 + 2.0 * np.cos(2 * np.pi * hour / 24),
        )
        readings.append(r)
        db.add(r)
        
    db.commit()
    
    # Verify feature dataframe creation
    df = build_features_dataframe(readings)
    assert len(df) == 60
    assert "aqi_lag_1" in df.columns
    assert "aqi_roll_3" in df.columns
    assert "hour_sin" in df.columns
    
    # Verify training pipeline
    results = train_forecast_pipeline(db)
    assert results["model_name"] == "gradient_boosting_v1"
    assert "mae" in results
    assert "rmse" in results
    assert "baseline_mae" in results
    assert results["sample_count"] > 0
    
    # Check that model run was recorded in DB
    run = db.query(ModelRun).first()
    assert run is not None
    assert run.mae == results["mae"]
    assert run.status == "active"
