from uuid import uuid4
from datetime import datetime

from sqlalchemy import (
    create_engine, Uuid, Column, String, Integer, Numeric, DateTime, ForeignKey,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

# ponytail: check_same_thread=False added for SQLite local dev, must NOT be set for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    **({"connect_args": {"check_same_thread": False}} if "sqlite" in DATABASE_URL else {}),
)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    owner_id = Column(Uuid(), primary_key=True, default=uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(Uuid(), primary_key=True, default=uuid4)
    owner_id = Column(Uuid(), ForeignKey("users.owner_id"), nullable=False)
    store_name = Column(String, nullable=False)


class InventoryItem(Base):
    __tablename__ = "inventory"

    item_id = Column(Uuid(), primary_key=True, default=uuid4)
    store_id = Column(Uuid(), ForeignKey("stores.store_id"), nullable=False)
    barcode_isbn = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock_count = Column(Integer, nullable=False)
    clean_image_url = Column(String, nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Uuid(), primary_key=True, default=uuid4)
    item_id = Column(Uuid(), ForeignKey("inventory.item_id"), nullable=False)
    store_id = Column(Uuid(), ForeignKey("stores.store_id"), nullable=False)
    sale_date = Column(DateTime, default=datetime.utcnow)
    receipt_image_url = Column(String, nullable=True)


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Uuid(), ForeignKey("users.owner_id"), nullable=False)
    push_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
