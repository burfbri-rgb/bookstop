from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select

from app.database import SessionLocal, InventoryItem, Store
from app.schemas import InventoryCreate, InventoryUpdate, InventoryResponse, ProcessImageResponse
from app.auth import require_owner_id
from app.storage import process_and_upload

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _verify_store_ownership(session, store_id: UUID, owner_id: UUID) -> Store:
    store = session.execute(
        select(Store).where(Store.store_id == store_id, Store.owner_id == owner_id)
    ).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


def _verify_item_ownership(session, item_id: UUID, owner_id: UUID) -> InventoryItem:
    item = session.execute(
        select(InventoryItem).join(Store, InventoryItem.store_id == Store.store_id).where(
            InventoryItem.item_id == item_id, Store.owner_id == owner_id
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/process-image", response_model=ProcessImageResponse)
def process_image(file: UploadFile = File(...), owner_id: UUID = Depends(require_owner_id)):
    url = process_and_upload(file.file.read(), "items")
    return ProcessImageResponse(clean_image_url=url)


@router.post("", response_model=InventoryResponse, status_code=201)
def create_item(body: InventoryCreate, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        _verify_store_ownership(session, body.store_id, owner_id)
        item = InventoryItem(
            store_id=body.store_id,
            price=body.price,
            stock_count=body.stock_count,
            barcode_isbn=body.barcode_isbn,
            clean_image_url=body.clean_image_url,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return item


@router.get("", response_model=list[InventoryResponse])
def list_items(
    store_id: UUID = Query(...),
    low_stock: int | None = Query(None),
    owner_id: UUID = Depends(require_owner_id),
):
    with SessionLocal() as session:
        _verify_store_ownership(session, store_id, owner_id)
        query = select(InventoryItem).where(InventoryItem.store_id == store_id)
        if low_stock is not None:
            query = query.where(InventoryItem.stock_count <= low_stock)
        items = session.execute(query).scalars().all()
        return items


@router.get("/by-barcode/{barcode}", response_model=InventoryResponse)
def get_item_by_barcode(
    barcode: str,
    store_id: UUID = Query(...),
    owner_id: UUID = Depends(require_owner_id),
):
    with SessionLocal() as session:
        _verify_store_ownership(session, store_id, owner_id)
        item = session.execute(
            select(InventoryItem).where(
                InventoryItem.store_id == store_id,
                InventoryItem.barcode_isbn == barcode,
            )
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item


@router.patch("/{item_id}", response_model=InventoryResponse)
def update_item(item_id: UUID, body: InventoryUpdate, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        item = _verify_item_ownership(session, item_id, owner_id)
        if body.price is not None:
            item.price = body.price
        if body.stock_count is not None:
            item.stock_count = body.stock_count
        if body.barcode_isbn is not None:
            item.barcode_isbn = body.barcode_isbn
        session.commit()
        session.refresh(item)
        return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: UUID, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        item = _verify_item_ownership(session, item_id, owner_id)
        session.delete(item)
        session.commit()
