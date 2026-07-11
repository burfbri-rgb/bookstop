import csv, io
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func

from app.database import SessionLocal, Transaction, InventoryItem, Store
from app.schemas import SaleResponse
from app.auth import require_owner_id
from app.storage import upload_raw
from app.routers.notifications_router import send_push

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _verify_store_ownership(session, store_id: UUID, owner_id: UUID) -> Store:
    store = session.execute(
        select(Store).where(Store.store_id == store_id, Store.owner_id == owner_id)
    ).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


# ponytail: single-session stock deduct, no optimistic locking — add when concurrent POS needed
@router.post("/sale", response_model=SaleResponse, status_code=201)
def process_sale(
    store_id: str = Form(...),
    item_id: str = Form(...),
    receipt_image: UploadFile | None = File(None),
    owner_id: UUID = Depends(require_owner_id),
):
    with SessionLocal() as session:
        sid, iid = UUID(store_id), UUID(item_id)
        _verify_store_ownership(session, sid, owner_id)

        item = session.execute(
            select(InventoryItem).where(
                InventoryItem.item_id == iid, InventoryItem.store_id == sid
            )
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in this store")
        if item.stock_count <= 0:
            raise HTTPException(status_code=400, detail="Item out of stock")

        item.stock_count -= 1
        # ponytail: push notification on zero stock, best-effort (fire-and-forget)
        if item.stock_count <= 0:
            send_push(owner_id, "Out of Stock", f"{item.barcode_isbn or 'Item'} is now out of stock")

        receipt_url = None
        if receipt_image:
            receipt_url = upload_raw(
                receipt_image.file.read(),
                "receipts",
            )

        tx = Transaction(item_id=iid, store_id=sid, receipt_image_url=receipt_url)
        session.add(tx)
        session.commit()
        session.refresh(tx)
        return tx


@router.get("/stats/{store_id}")
def store_stats(store_id: UUID, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        _verify_store_ownership(session, store_id, owner_id)
        today = date.today()
        row = session.execute(
            select(
                func.coalesce(func.sum(InventoryItem.price), 0),
                func.count(Transaction.transaction_id),
            )
            .select_from(Transaction)
            .join(InventoryItem, Transaction.item_id == InventoryItem.item_id)
            .where(Transaction.store_id == store_id)
            .where(func.date(Transaction.sale_date) == today)
        ).one()
        return {"daily_revenue": float(row[0]), "total_sold": row[1], "transaction_count": row[1]}


# ponytail: csv.writer + StreamingResponse, skip pandas/add pagination at 10k+ rows
@router.get("/export/{store_id}")
def export_csv(store_id: UUID, owner_id: UUID = Depends(require_owner_id)):
    with SessionLocal() as session:
        _verify_store_ownership(session, store_id, owner_id)

        rows = session.execute(
            select(
                Transaction.transaction_id,
                Transaction.item_id,
                InventoryItem.barcode_isbn,
                InventoryItem.price,
                Transaction.sale_date,
                Transaction.receipt_image_url,
            )
            .join(InventoryItem, Transaction.item_id == InventoryItem.item_id)
            .where(Transaction.store_id == store_id)
            .order_by(Transaction.sale_date.desc())
        ).all()

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["transaction_id", "item_id", "barcode_isbn", "price", "sale_date", "receipt_image_url"])
        for r in rows:
            w.writerow(r)

        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transactions_{store_id}.csv"},
        )
