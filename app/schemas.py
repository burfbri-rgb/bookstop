from uuid import UUID
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    owner_id: UUID


class StoreCreate(BaseModel):
    store_name: str


class StoreResponse(BaseModel):
    store_id: UUID
    owner_id: UUID
    store_name: str

    model_config = {"from_attributes": True}


class InventoryCreate(BaseModel):
    store_id: UUID
    price: Decimal
    stock_count: int
    barcode_isbn: str | None = None
    clean_image_url: str | None = None


class InventoryUpdate(BaseModel):
    price: Decimal | None = None
    stock_count: int | None = None
    barcode_isbn: str | None = None


class InventoryResponse(BaseModel):
    item_id: UUID
    store_id: UUID
    barcode_isbn: str | None = None
    price: Decimal
    stock_count: int
    clean_image_url: str | None = None

    model_config = {"from_attributes": True}


class ProcessImageResponse(BaseModel):
    clean_image_url: str


class SaleRequest(BaseModel):
    store_id: UUID
    item_id: UUID


class SaleResponse(BaseModel):
    transaction_id: UUID
    item_id: UUID
    store_id: UUID
    sale_date: datetime
    receipt_image_url: str | None = None

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    db: str
