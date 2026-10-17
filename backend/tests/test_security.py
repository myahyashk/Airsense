from datetime import timedelta
import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    check_login_rate_limit,
    record_failed_login,
    clear_login_rate_limit
)
from fastapi import HTTPException

def test_password_hashing():
    pwd = "StudentSecure2026!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_jwt_token_creation_and_decoding():
    payload = {"sub": "42", "role": "admin"}
    token, expire = create_access_token(payload, expires_delta=timedelta(minutes=30))
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["role"] == "admin"

def test_login_rate_limiter():
    key = "127.0.0.1:test_brute_force@airsense.edu.pk"
    clear_login_rate_limit(key)
    
    # 4 failed attempts should succeed check
    for _ in range(4):
        record_failed_login(key)
        check_login_rate_limit(key)
        
    # 5th failed attempt should trigger 429
    record_failed_login(key)
    with pytest.raises(HTTPException) as exc:
        check_login_rate_limit(key)
    assert exc.value.status_code == 429
    
    clear_login_rate_limit(key)
