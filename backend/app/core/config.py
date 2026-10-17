from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "AirSense"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = "airsense_super_secret_jwt_key_2026_university_bbsutsd_khairpur"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Seeds
    ADMIN_NAME: str = "Admin User"
    ADMIN_EMAIL: str = "admin@airsense.edu.pk"
    ADMIN_PASSWORD: str = "AdminAirSense2026!"
    
    SAMPLE_USER_NAME: str = "Yahya Student"
    SAMPLE_USER_EMAIL: str = "student@airsense.edu.pk"
    SAMPLE_USER_PASSWORD: str = "StudentAirSense2026!"
    
    # Database
    DATABASE_URL: str = "sqlite:///./airsense.db"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Monitoring target: Khairpur Mirs, Sindh, Pakistan
    LATITUDE: float = 27.53
    LONGITUDE: float = 68.76
    LOCATION_NAME: str = "BBSUTSD Campus, Khairpur Mirs"
    TIMEZONE: str = "Asia/Karachi"
    
    # Thresholds & Scheduling
    FETCH_INTERVAL_MINUTES: int = 30
    DEFAULT_WARNING_THRESHOLD: int = 101
    DEFAULT_DANGER_THRESHOLD: int = 151
    
    # Paths
    ML_ARTIFACT_DIR: Path = BASE_DIR / "app" / "ml_artifacts"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.ML_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
