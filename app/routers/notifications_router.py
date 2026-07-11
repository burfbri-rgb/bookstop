from uuid import UUID
from urllib.request import Request, urlopen
from urllib.error import URLError
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete

from app.database import SessionLocal, PushToken
from app.auth import require_owner_id

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class RegisterPush(BaseModel):
    push_token: str


@router.post("/register")
def register_token(body: RegisterPush, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        existing = session.execute(
            select(PushToken).where(
                PushToken.owner_id == owner_id,
                PushToken.push_token == body.push_token,
            )
        ).scalar_one_or_none()
        if existing:
            return {"status": "ok"}
        token = PushToken(owner_id=owner_id, push_token=body.push_token)
        session.add(token)
        session.commit()
        return {"status": "ok"}


def send_push(owner_id: UUID, title: str, body_text: str):
    with SessionLocal() as session:
        tokens = session.execute(
            select(PushToken).where(PushToken.owner_id == owner_id)
        ).scalars().all()
    for t in tokens:
        payload = json.dumps({
            "to": t.push_token,
            "title": title,
            "body": body_text,
            "sound": "default",
        }).encode()
        req = Request(EXPO_PUSH_URL, data=payload, headers={"Content-Type": "application/json"})
        try:
            urlopen(req, timeout=5)
        except URLError:
            pass
