from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.database import SessionLocal, User
from app.schemas import RegisterRequest, LoginRequest, AuthResponse
from app.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    with SessionLocal() as session:
        existing = session.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(email=body.email, password_hash=hash_password(body.password))
        session.add(user)
        session.commit()
        session.refresh(user)

        return AuthResponse(token=create_token(str(user.owner_id)), owner_id=user.owner_id)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    with SessionLocal() as session:
        user = session.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
        if not user or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return AuthResponse(token=create_token(str(user.owner_id)), owner_id=user.owner_id)
