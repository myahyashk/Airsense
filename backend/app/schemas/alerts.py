from typing import List, Optional
from pydantic import BaseModel, Field

class AlertOut(BaseModel):
    id: int
    source: str
    severity: str
    title: str
    message: str
    created_at: str
    expires_at: Optional[str] = None
    active: bool
    read: bool
    created_by: Optional[str] = None

class AlertsResponse(BaseModel):
    items: List[AlertOut]

class AlertCreate(BaseModel):
    severity: str = Field(..., pattern="^(info|warning|danger)$")
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)
    expires_in_hours: Optional[int] = Field(24, ge=1, le=168)

class AlertUpdate(BaseModel):
    active: bool
