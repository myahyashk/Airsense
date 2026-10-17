from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class CurrentReadingOut(BaseModel):
    timestamp: str
    location: str
    pm25: float
    pm10: float
    dust: float
    aqi: int
    category: str

class HistoryPoint(BaseModel):
    timestamp: str
    pm25: float
    pm10: float
    dust: float
    aqi: int

class HistoryResponse(BaseModel):
    points: List[HistoryPoint]

class ForecastPoint(BaseModel):
    timestamp: str
    aqi_pred: int
    category: str

class ForecastResponse(BaseModel):
    generated_at: str
    model: str
    points: List[ForecastPoint]

class GuidanceItem(BaseModel):
    audience: str
    icon: str
    title: str
    body: str

class GuidanceResponse(BaseModel):
    category: str
    items: List[GuidanceItem]
