from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    check_login_rate_limit,
    record_failed_login,
    clear_login_rate_limit
)
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserOut,
    UserMeOut,
    UserUpdateMe,
    ChangePassword
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/auth", tags=["Auth"])
PKT = timezone(timedelta(hours=5))

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
        
    hashed_pwd = get_password_hash(payload.password)
    user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hashed_pwd,
        role="user",  # Self-registration is always role 'user'
        active=True,
        notify_enabled=True,
        notify_threshold=settings.DEFAULT_WARNING_THRESHOLD,
        created_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log
    client_ip = request.client.host if request.client else None
    record_audit(db, user.email, "register", f"Self-registered user account '{user.name}'", client_ip)
    
    token, expires_at = create_access_token(data={"sub": str(user.id), "role": user.role})
    return AuthResponse(
        token=token,
        expires_at=expires_at.astimezone(PKT).isoformat(),
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=AuthResponse)
def login_user(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{email_clean}"
    
    # Rate limit protection against brute force
    check_login_rate_limit(rate_key)
    
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        record_failed_login(rate_key)
        record_audit(db, email_clean, "failed_login", "Invalid email or password attempt", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account has been deactivated. Please contact an administrator."
        )
        
    clear_login_rate_limit(rate_key)
    record_audit(db, user.email, "login", "User logged in successfully", client_ip)
    
    token, expires_at = create_access_token(data={"sub": str(user.id), "role": user.role})
    return AuthResponse(
        token=token,
        expires_at=expires_at.astimezone(PKT).isoformat(),
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserMeOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserMeOut.model_validate(current_user)

@router.patch("/me", response_model=UserMeOut)
def update_me(payload: UserUpdateMe, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.name is not None and payload.name.strip():
        current_user.name = payload.name.strip()
    if payload.notify_enabled is not None:
        current_user.notify_enabled = payload.notify_enabled
    if payload.notify_threshold is not None:
        current_user.notify_threshold = payload.notify_threshold
        
    db.commit()
    db.refresh(current_user)
    record_audit(db, current_user.email, "update_profile", "User updated personal profile preferences")
    return UserMeOut.model_validate(current_user)

@router.post("/change-password")
def change_password(payload: ChangePassword, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match"
        )
        
    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    record_audit(db, current_user.email, "change_password", "Password updated successfully")
    return {"ok": True}

@router.delete("/me")
def delete_own_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin", User.active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the sole active administrator account"
            )
            
    email = current_user.email
    db.delete(current_user)
    db.commit()
    record_audit(db, email, "delete_account", f"User account {email} permanently deleted by self")
    return {"ok": True}
