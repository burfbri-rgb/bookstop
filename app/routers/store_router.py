from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.database import SessionLocal, Store
from app.schemas import StoreCreate, StoreUpdate, StoreResponse
from app.auth import require_owner_id

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.get("", response_model=list[StoreResponse])
def list_stores(owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        stores = session.query(Store).filter(Store.owner_id == owner_id).all()
        return stores


@router.post("", response_model=StoreResponse, status_code=201)
def create_store(body: StoreCreate, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        store = Store(owner_id=owner_id, store_name=body.store_name)
        session.add(store)
        session.commit()
        session.refresh(store)
        return store


@router.patch("/{store_id}", response_model=StoreResponse)
def update_store(store_id: UUID, body: StoreUpdate, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        store = session.execute(
            select(Store).where(Store.store_id == store_id, Store.owner_id == owner_id)
        ).scalar_one_or_none()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        store.store_name = body.store_name
        session.commit()
        session.refresh(store)
        return store
