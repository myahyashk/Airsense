import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db
from app.db.models import User, SystemSetting
from app.core.security import get_password_hash, create_access_token

from sqlalchemy.pool import StaticPool

# Test database with StaticPool to retain tables across sessions
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_users():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Setup test users
    admin_user = User(
        name="Admin Test",
        email="admintest@airsense.edu.pk",
        password_hash=get_password_hash("AdminPass123!"),
        role="admin",
        active=True,
        notify_enabled=True,
        notify_threshold=101,
        created_at=datetime.now(timezone.utc)
    )
    student_user = User(
        name="Student Test",
        email="studenttest@airsense.edu.pk",
        password_hash=get_password_hash("StudentPass123!"),
        role="user",
        active=True,
        notify_enabled=True,
        notify_threshold=101,
        created_at=datetime.now(timezone.utc)
    )
    db.add(admin_user)
    db.add(student_user)
    db.add(SystemSetting(key="warning_threshold", value="101"))
    db.add(SystemSetting(key="danger_threshold", value="151"))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_unauthenticated_requests():
    # User endpoint without token returns 401
    res = client.get("/api/history")
    assert res.status_code == 401
    assert "error" in res.json()

    # Admin endpoint without token returns 401
    res_admin = client.get("/api/admin/overview")
    assert res_admin.status_code == 401
    assert "error" in res_admin.json()

def test_user_cannot_access_admin_endpoints():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "studenttest@airsense.edu.pk").first()
    token, _ = create_access_token({"sub": str(user.id), "role": user.role})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}
    
    # User can access user routes
    res_history = client.get("/api/history", headers=headers)
    assert res_history.status_code == 200

    # User MUST get 403 on admin routes
    res_overview = client.get("/api/admin/overview", headers=headers)
    assert res_overview.status_code == 403
    assert "error" in res_overview.json()
    assert "Admin privileges required" in res_overview.json()["error"]

    res_thresholds = client.get("/api/admin/thresholds", headers=headers)
    assert res_thresholds.status_code == 403

def test_admin_can_access_admin_endpoints():
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admintest@airsense.edu.pk").first()
    token, _ = create_access_token({"sub": str(admin.id), "role": admin.role})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}
    res_overview = client.get("/api/admin/overview", headers=headers)
    assert res_overview.status_code == 200
    assert "data" in res_overview.json()
    assert "model" in res_overview.json()
