from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import AuditLog
from app.core.logging import logger

def record_audit(
    db: Session,
    user_email: str,
    action: str,
    details: str,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Record an audit trail event in the database."""
    log_entry = AuditLog(
        time=datetime.now(timezone.utc),
        user_email=user_email,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(log_entry)
    try:
        db.commit()
        db.refresh(log_entry)
        logger.info(f"[AUDIT] user={user_email} action={action} details={details}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record audit log: {e}")
    return log_entry
