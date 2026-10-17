from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator
from app.schemas.auth import UserAdminOut

class ThresholdsConfig(BaseModel):
    warning: int = Field(..., ge=0, le=500, description="Warning AQI threshold (default 101)")
    danger: int = Field(..., ge=0, le=500, description="Danger AQI threshold (default 151)")

    @model_validator(mode="after")
    def validate_thresholds(self):
        if self.warning >= self.danger:
            raise ValueError("Warning threshold must be strictly lower than Danger threshold")
        return self

class AdminUserUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern="^(user|admin)$")
    active: Optional[bool] = None

class ResetPasswordResponse(BaseModel):
    temporary_password: str

class AdminOverviewData(BaseModel):
    last_fetch: Optional[str] = None
    freshness_minutes: int
    source_status: str

class AdminOverviewModel(BaseModel):
    name: str
    trained_at: Optional[str] = None
    mae: float
    rmse: float
    baseline_mae: float

class AdminOverviewUsers(BaseModel):
    total: int
    admins: int

class AdminOverviewAlerts(BaseModel):
    auto: int
    manual: int

class AdminOverviewResponse(BaseModel):
    data: AdminOverviewData
    model: AdminOverviewModel
    users: AdminOverviewUsers
    alerts_last_7_days: AdminOverviewAlerts

class AdminUsersListResponse(BaseModel):
    items: List[UserAdminOut]
    total: int

class RetrainResponse(BaseModel):
    job_id: str
    status: str

class ModelStatusResponse(BaseModel):
    job_id: Optional[str] = None
    status: str  # "idle" | "queued" | "running" | "done" | "failed"
    message: Optional[str] = None
    finished_at: Optional[str] = None

class AuditItem(BaseModel):
    time: str
    user: str
    action: str
    details: str

class AuditListResponse(BaseModel):
    items: List[AuditItem]
