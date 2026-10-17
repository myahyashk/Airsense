from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}

class UserAdminOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class UserMeOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    notify_enabled: bool
    notify_threshold: int

    model_config = {"from_attributes": True}

class UserUpdateMe(BaseModel):
    name: Optional[str] = None
    notify_enabled: Optional[bool] = None
    notify_threshold: Optional[int] = Field(None, ge=0, le=500)

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_new_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        return v

class AuthResponse(BaseModel):
    token: str
    expires_at: str
    user: UserOut
