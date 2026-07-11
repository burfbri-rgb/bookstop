from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from fastapi import HTTPException, Header
from jose import JWTError, jwt

from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(owner_id: str) -> str:
    payload = {
        "sub": owner_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def require_owner_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    owner_id = decode_token(authorization.removeprefix("Bearer "))
    if not owner_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return UUID(owner_id)
